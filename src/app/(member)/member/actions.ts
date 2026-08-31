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

    if (!member.gym || member.gym.status !== "ACTIVE" || member.gym.deletedAt) {
      return { ok: false, error: "Gym facility is inactive or suspended." };
    }

    const activeMembership = member.memberships[0];
    const isMembershipValid = !!activeMembership && activeMembership.endDate >= new Date();

    // Generate cryptographic HMAC-SHA256 token valid for 60 seconds
    const qrToken = generateMemberQrToken({
      memberId: member.id,
      gymId: member.gym?.id || member.gymId,
      memberCode: member.memberId,
      gymCode: member.gym?.gymCode || "XYRO",
      ttlSeconds: 60,
    });

    return {
      ok: true,
      qrToken,
      memberId: member.memberId,
      gymCode: member.gym?.gymCode || "XYRO",
      gymName: member.gym?.name || "Gym",
      isValid: isMembershipValid,
    };
  } catch (error) {
    console.error("Failed to generate signed member QR pass:", error);
    return { ok: false, error: "Internal error generating pass." };
  }
}

export type OnlineRenewalResult =
  | {
      ok: true;
      planName: string;
      newEndDate: string;
      amount: number;
      transactionId: string;
    }
  | {
      ok: false;
      error: string;
    };

/**
 * Server Action for online member renewal.
 * Automatically extends membership and records PAID transaction in the ledger.
 */
export async function renewMemberPlanOnlineAction(params?: {
  planId?: string;
  paymentMethod?: string;
}): Promise<OnlineRenewalResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "Unauthorized: Active member session required." };
    }

    const member = await prisma.member.findUnique({
      where: { userId: session.user.id },
      include: {
        gym: true,
        memberships: {
          include: { plan: true },
          orderBy: { endDate: "desc" },
          take: 1,
        },
      },
    });

    if (!member || member.deletedAt || !member.isActive) {
      return { ok: false, error: "Active member account not found." };
    }

    // Determine target plan
    let plan = null;
    if (params?.planId) {
      plan = await prisma.membershipPlan.findFirst({
        where: { id: params.planId, gymId: member.gymId, deletedAt: null, isActive: true },
      });
    } else if (member.memberships.length > 0) {
      plan = member.memberships[0].plan;
    } else {
      plan = await prisma.membershipPlan.findFirst({
        where: { gymId: member.gymId, deletedAt: null, isActive: true },
        orderBy: { price: "asc" },
      });
    }

    if (!plan) {
      return { ok: false, error: "No active membership plan available for renewal." };
    }

    const now = new Date();
    const transactionId = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;

    const result = await prisma.$transaction(async (tx) => {
      const existing = member.memberships[0];
      const startDate = existing && existing.endDate > now ? existing.endDate : now;
      const endDate = new Date(startDate.getTime() + plan.durationDays * 86400000);

      const membership = await tx.membership.create({
        data: {
          gymId: member.gymId,
          memberId: member.id,
          planId: plan.id,
          status: "ACTIVE",
          startDate,
          endDate,
          daysRemaining: Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 86400000)),
          autoRenew: false,
        },
      });

      // Automatically record in Payment Ledger
      await tx.payment.create({
        data: {
          gymId: member.gymId,
          memberId: member.id,
          membershipId: membership.id,
          amount: plan.price,
          tax: 0,
          discount: 0,
          totalAmount: plan.price,
          status: "PAID",
          method: "ONLINE",
          paidAt: now,
          transactionId,
          notes: `Online Self-Renewal — ${plan.name} (${params?.paymentMethod || "UPI/Online"})`,
        },
      });

      // Create Notification for Member
      await tx.notification.create({
        data: {
          gymId: member.gymId,
          userId: member.userId,
          type: "PAYMENT_RECEIVED",
          title: "Membership Renewed Successfully",
          message: `Your subscription to ${plan.name} has been renewed until ${endDate.toLocaleDateString()}. Recorded payment: ₹${plan.price.toLocaleString()}.`,
        },
      });

      return { membership, endDate };
    });

    const { logAuditEvent } = await import("@/lib/audit");
    await logAuditEvent({
      userId: member.userId,
      gymId: member.gymId,
      action: "MEMBERSHIP_RENEW_ONLINE",
      resource: "membership",
      resourceId: result.membership.id,
      metadata: {
        planName: plan.name,
        amount: plan.price,
        transactionId,
        validUntil: result.endDate.toISOString(),
      },
    });

    return {
      ok: true,
      planName: plan.name,
      newEndDate: result.endDate.toISOString(),
      amount: plan.price,
      transactionId,
    };
  } catch (error) {
    console.error("Failed to renew member plan online:", error);
    return { ok: false, error: "Internal processing error during renewal." };
  }
}

/* ------------------------------------------------------------------ */
/* Daily Member Progress & Health Tracker                             */
/* ------------------------------------------------------------------ */

export type LogProgressInput = {
  weight?: number;
  height?: number;
  bodyFat?: number;
  chest?: number;
  waist?: number;
  arms?: number;
  thighs?: number;
  calories?: number;
  waterLiters?: number;
  notes?: string;
};

export async function logMemberDailyProgressAction(
  input: LogProgressInput
): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "Unauthorized: Active member session required." };
    }

    const member = await prisma.member.findUnique({
      where: { userId: session.user.id },
      select: { id: true, gymId: true, isActive: true, deletedAt: true },
    });

    if (!member || member.deletedAt || !member.isActive) {
      return { ok: false, error: "Active member account not found." };
    }

    // Calculate BMI if height and weight are provided
    let bmi: number | undefined = undefined;
    if (input.weight && input.height && input.height > 0) {
      const heightInMeters = input.height / 100;
      bmi = parseFloat((input.weight / (heightInMeters * heightInMeters)).toFixed(1));
    }

    await prisma.progressRecord.create({
      data: {
        memberId: member.id,
        date: new Date(),
        weight: input.weight ? Number(input.weight) : null,
        height: input.height ? Number(input.height) : null,
        bodyFat: input.bodyFat ? Number(input.bodyFat) : null,
        chest: input.chest ? Number(input.chest) : null,
        waist: input.waist ? Number(input.waist) : null,
        arms: input.arms ? Number(input.arms) : null,
        thighs: input.thighs ? Number(input.thighs) : null,
        calories: input.calories ? Number(input.calories) : null,
        waterLiters: input.waterLiters ? Number(input.waterLiters) : null,
        bmi: bmi || null,
        notes: input.notes?.trim() || null,
      },
    });

    return { ok: true };
  } catch (error) {
    console.error("Failed to log daily progress:", error);
    return { ok: false, error: "Failed to record daily progress." };
  }
}

export async function deleteMemberProgressRecordAction(
  recordId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "Unauthorized: Active member session required." };
    }

    const member = await prisma.member.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!member) {
      return { ok: false, error: "Member profile not found." };
    }

    const record = await prisma.progressRecord.findFirst({
      where: { id: recordId, memberId: member.id },
    });

    if (!record) {
      return { ok: false, error: "Progress entry not found." };
    }

    await prisma.progressRecord.delete({
      where: { id: recordId },
    });

    return { ok: true };
  } catch (error) {
    console.error("Failed to delete progress record:", error);
    return { ok: false, error: "Failed to delete entry." };
  }
}


