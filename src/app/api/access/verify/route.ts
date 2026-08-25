import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export type AccessStatus =
  | "ACCESS_GRANTED"
  | "ACCESS_DENIED"
  | "MEMBERSHIP_EXPIRED"
  | "INVALID_QR"
  | "MEMBER_NOT_FOUND"
  | "DUPLICATE_SCAN"
  | "DEVICE_OFFLINE";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { qrPayload, memberId, gymCode, method = "QR", deviceId } = body;

    let targetMemberId = memberId;
    let targetGymCode = gymCode;

    // 1. If QR payload was provided, parse and validate dynamic token
    if (qrPayload) {
      try {
        const parsed = typeof qrPayload === "string" ? JSON.parse(qrPayload) : qrPayload;
        targetMemberId = parsed.id;
        targetGymCode = parsed.gym;

        // Check freshness (token expires after 90 seconds)
        const tokenTimestamp = parsed.ts;
        const now = Date.now();
        if (!tokenTimestamp || now - tokenTimestamp > 90000 || now - tokenTimestamp < -10000) {
          return NextResponse.json({
            status: "INVALID_QR" as AccessStatus,
            message: "Dynamic QR code has expired. Please refresh your member pass.",
            granted: false,
          }, { status: 400 });
        }
      } catch {
        return NextResponse.json({
          status: "INVALID_QR" as AccessStatus,
          message: "Malformed or unrecognized QR format.",
          granted: false,
        }, { status: 400 });
      }
    }

    if (!targetMemberId) {
      return NextResponse.json({
        status: "MEMBER_NOT_FOUND" as AccessStatus,
        message: "Missing athlete identification.",
        granted: false,
      }, { status: 400 });
    }

    // 2. Lookup Gym Tenant
    const gym = await prisma.gym.findFirst({
      where: {
        ...(targetGymCode ? { gymCode: targetGymCode } : {}),
        deletedAt: null,
      },
    });

    if (!gym) {
      return NextResponse.json({
        status: "ACCESS_DENIED" as AccessStatus,
        message: "Facility not recognized or inactive.",
        granted: false,
      }, { status: 404 });
    }

    // 3. Lookup Member in Gym
    const member = await prisma.member.findFirst({
      where: {
        OR: [
          { id: targetMemberId, gymId: gym.id },
          { memberId: targetMemberId, gymId: gym.id },
        ],
        deletedAt: null,
      },
      include: {
        user: { select: { name: true, email: true } },
        memberships: {
          where: { status: "ACTIVE" },
          include: { plan: { select: { name: true } } },
          orderBy: { endDate: "desc" },
          take: 1,
        },
      },
    });

    if (!member) {
      return NextResponse.json({
        status: "MEMBER_NOT_FOUND" as AccessStatus,
        message: "Athlete profile not found in facility records.",
        granted: false,
      }, { status: 404 });
    }

    if (!member.isActive) {
      return NextResponse.json({
        status: "ACCESS_DENIED" as AccessStatus,
        message: "Athlete account has been paused or deactivated.",
        granted: false,
        athleteName: member.user.name,
      }, { status: 403 });
    }

    // 4. Verify Active Membership Validity
    const activeMembership = member.memberships[0];
    const now = new Date();

    if (!activeMembership || activeMembership.endDate < now) {
      return NextResponse.json({
        status: "MEMBERSHIP_EXPIRED" as AccessStatus,
        message: "Membership validity has lapsed. Please renew at the front desk.",
        granted: false,
        athleteName: member.user.name,
      }, { status: 403 });
    }

    // 5. Replay & Duplicate Scan Protection (Within 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentScan = await prisma.attendance.findFirst({
      where: {
        gymId: gym.id,
        memberId: member.id,
        checkIn: { gte: fiveMinutesAgo },
      },
    });

    if (recentScan) {
      return NextResponse.json({
        status: "DUPLICATE_SCAN" as AccessStatus,
        message: `Athlete ${member.user.name} already checked in within the last 5 minutes.`,
        granted: false,
        athleteName: member.user.name,
      }, { status: 429 });
    }

    // 6. Record Authorized Check-in Event
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const record = await prisma.attendance.create({
      data: {
        gymId: gym.id,
        memberId: member.id,
        date: dayStart,
        checkIn: now,
        method: method === "MANUAL" ? "MANUAL" : "MEMBER_QR",
        notes: `Turnstile/Gate check-in ${deviceId ? `(Device: ${deviceId})` : ""}`,
      },
    });

    return NextResponse.json({
      status: "ACCESS_GRANTED" as AccessStatus,
      message: `Welcome, ${member.user.name}! Turnstile access unlocked.`,
      granted: true,
      athlete: {
        id: member.id,
        memberId: member.memberId,
        name: member.user.name,
        planName: activeMembership.plan.name,
        validUntil: activeMembership.endDate.toISOString(),
      },
      checkInTime: record.checkIn.toISOString(),
    });
  } catch (error) {
    console.error("[Access Verify Error]:", error);
    return NextResponse.json({
      status: "ACCESS_DENIED" as AccessStatus,
      message: "Access verification service encountered an internal error.",
      granted: false,
    }, { status: 500 });
  }
}
