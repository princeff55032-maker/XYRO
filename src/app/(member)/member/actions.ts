"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { generateMemberQrToken } from "@/lib/qr-token";

export type QrPassActionResult =
  | {
      ok: true;
      qrToken: string;
      memberId: string;
      gymCode: string;
      gymName: string;
      isValid: boolean;
    }
  | {
      ok: false;
      error: string;
    };

/**
 * Secure Server Action that generates a fresh, cryptographically signed
 * HMAC-SHA256 JWT dynamic QR token for the authenticated gym member.
 */
export async function getSignedMemberQrPassAction(): Promise<QrPassActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "Unauthorized: Active member session required." };
    }

    const member = await prisma.member.findUnique({
      where: { userId: session.user.id },
      include: {
        gym: {
          select: { id: true, gymCode: true, name: true, status: true, deletedAt: true },
        },
        memberships: {
          where: { status: "ACTIVE" },
          select: { id: true, endDate: true },
          orderBy: { endDate: "desc" },
          take: 1,
        },
      },
    });

    if (!member || member.deletedAt) {
      return { ok: false, error: "Member profile not found." };
    }

    if (!member.isActive) {
      return { ok: false, error: "Member account is currently inactive." };
    }

    if (member.gym.status !== "ACTIVE" || member.gym.deletedAt) {
      return { ok: false, error: "Gym facility is inactive or suspended." };
    }

    const activeMembership = member.memberships[0];
    const isMembershipValid = !!activeMembership && activeMembership.endDate >= new Date();

    // Generate cryptographic HMAC-SHA256 token valid for 60 seconds
    const qrToken = generateMemberQrToken({
      memberId: member.id,
      gymId: member.gym.id,
      memberCode: member.memberId,
      gymCode: member.gym.gymCode,
      ttlSeconds: 60,
    });

    return {
      ok: true,
      qrToken,
      memberId: member.memberId,
      gymCode: member.gym.gymCode,
      gymName: member.gym.name,
      isValid: isMembershipValid,
    };
  } catch (error) {
    console.error("Failed to generate signed member QR pass:", error);
    return { ok: false, error: "Internal error generating pass." };
  }
}
