import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyMemberQrToken } from "@/lib/qr-token";
import { authenticateAccessDevice } from "@/lib/device-auth";
import { getClientIp, checkRateLimit } from "@/lib/ratelimit";

export type AccessStatus =
  | "ACCESS_GRANTED"
  | "ACCESS_DENIED"
  | "MEMBERSHIP_EXPIRED"
  | "INVALID_QR"
  | "MEMBER_NOT_FOUND"
  | "DUPLICATE_SCAN"
  | "FACILITY_MISMATCH"
  | "DEVICE_UNAUTHORIZED";

export async function POST(req: Request) {
  try {
    // 1. Rate Limiting (60 requests per minute per IP / Device)
    const ip = await getClientIp();
    const rl = await checkRateLimit(`access-verify:${ip}`, 60, 60);
    if (!rl.success) {
      return NextResponse.json(
        {
          status: "ACCESS_DENIED" as AccessStatus,
          message: "Rate limit exceeded. Please wait before scanning again.",
          granted: false,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSeconds) },
        }
      );
    }

    // 2. Authenticate Hardware Device / Staff Session
    const authResult = await authenticateAccessDevice(req);
    if (!authResult.ok) {
      return NextResponse.json(
        {
          status: "DEVICE_UNAUTHORIZED" as AccessStatus,
          message: authResult.error,
          granted: false,
        },
        { status: authResult.status }
      );
    }

    const { gymId: deviceGymId, gymCode: deviceGymCode, deviceName } = authResult;

    // 3. Parse JSON Body
    const body = await req.json().catch(() => ({}));
    const { qrPayload, memberId, method = "QR" } = body;

    let targetMemberId: string | null = null;
    let targetGymId: string | null = null;

    // 4. Verify Cryptographic QR Token
    if (qrPayload) {
      const qrVerification = verifyMemberQrToken(qrPayload);
      if (!qrVerification.valid) {
        return NextResponse.json(
          {
            status: "INVALID_QR" as AccessStatus,
            message: qrVerification.error,
            granted: false,
          },
          { status: 400 }
        );
      }

      targetMemberId = qrVerification.payload.sub;
      targetGymId = qrVerification.payload.gymId;

      // Strict Multi-Tenant Boundary: Token must belong to the device's gym
      if (targetGymId !== deviceGymId) {
        return NextResponse.json(
          {
            status: "FACILITY_MISMATCH" as AccessStatus,
            message: "Member pass belongs to a different gym facility.",
            granted: false,
          },
          { status: 403 }
        );
      }
    } else if (memberId && typeof memberId === "string") {
      // Manual memberId lookup (only permitted when scanner or staff is authenticated)
      targetMemberId = memberId.trim();
      targetGymId = deviceGymId;
    } else {
      return NextResponse.json(
        {
          status: "INVALID_QR" as AccessStatus,
          message: "Missing QR pass token or member identification.",
          granted: false,
        },
        { status: 400 }
      );
    }

    // 5. Lookup Member strictly within the authenticated Gym Tenant
    const member = await prisma.member.findFirst({
      where: {
        gymId: deviceGymId,
        deletedAt: null,
        OR: [
          { id: targetMemberId },
          { memberId: targetMemberId },
        ],
      },
      include: {
        user: { select: { name: true } },
        memberships: {
          where: { status: "ACTIVE" },
          include: { plan: { select: { name: true } } },
          orderBy: { endDate: "desc" },
          take: 1,
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        {
          status: "MEMBER_NOT_FOUND" as AccessStatus,
          message: "Member profile not found in facility records.",
          granted: false,
        },
        { status: 404 }
      );
    }

    if (!member.isActive) {
      return NextResponse.json(
        {
          status: "ACCESS_DENIED" as AccessStatus,
          message: "Member account is inactive or paused.",
          granted: false,
          memberName: member.user.name,
        },
        { status: 403 }
      );
    }

    // 6. Verify Active Membership Validity
    const activeMembership = member.memberships[0];
    const now = new Date();

    if (!activeMembership || activeMembership.endDate < now) {
      return NextResponse.json(
        {
          status: "MEMBERSHIP_EXPIRED" as AccessStatus,
          message: "Membership plan has expired. Please renew at the front desk.",
          granted: false,
          memberName: member.user.name,
        },
        { status: 403 }
      );
    }

    // 7. Atomic Anti-Passback Guard & Check-In Creation (Race-Condition Free)
    const checkInResult = await prisma.$transaction(async (tx) => {
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
      const recentScan = await tx.attendance.findFirst({
        where: {
          gymId: deviceGymId,
          memberId: member.id,
          checkIn: { gte: threeMinutesAgo },
        },
      });

      if (recentScan) {
        return { duplicate: true, recentCheckIn: recentScan.checkIn };
      }

      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);

      const record = await tx.attendance.create({
        data: {
          gymId: deviceGymId,
          memberId: member.id,
          date: dayStart,
          checkIn: now,
          method: method === "MANUAL" ? "MANUAL" : "MEMBER_QR",
          notes: `Access verified via ${deviceName}`,
        },
      });

      return { duplicate: false, record };
    }, {
      isolationLevel: "Serializable",
    });

    if (checkInResult.duplicate) {
      return NextResponse.json(
        {
          status: "DUPLICATE_SCAN" as AccessStatus,
          message: `${member.user.name} already checked in within the last 3 minutes.`,
          granted: false,
          memberName: member.user.name,
        },
        { status: 429 }
      );
    }

    const record = checkInResult.record!;

    // 8. Minimized Secure Response (Zero PII leaks)
    return NextResponse.json({
      status: "ACCESS_GRANTED" as AccessStatus,
      message: `Welcome, ${member.user.name}! Turnstile access unlocked.`,
      granted: true,
      memberName: member.user.name,
      planName: activeMembership.plan.name,
      validUntil: activeMembership.endDate.toISOString(),
      checkInTime: record.checkIn.toISOString(),
    });
  } catch (error) {
    console.error("[Access Verify Error]:", error);
    return NextResponse.json(
      {
        status: "ACCESS_DENIED" as AccessStatus,
        message: "Access verification service encountered an internal error.",
        granted: false,
      },
      { status: 500 }
    );
  }
}
