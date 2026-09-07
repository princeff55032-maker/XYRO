"use server";

import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import type { GymStatus, SubscriptionPlan, SubscriptionStatus, AccountStatus } from "@prisma/client";

export type AdminActionResult<T = unknown> = {
  ok: boolean;
  error?: string;
  data?: T;
};

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized: Active session required");
  }

  // Re-verify user role and status directly from database
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!dbUser || dbUser.deletedAt || dbUser.status !== "ACTIVE" || dbUser.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden: Super Admin access required");
  }

  return { session, user: dbUser };
}

// ── Gym Management ─────────────────────────────────────────────

export async function toggleGymStatusAction(
  gymId: string,
  newStatus: GymStatus
): Promise<AdminActionResult> {
  try {
    const { user: admin } = await requireSuperAdmin();

    const updated = await prisma.gym.update({
      where: { id: gymId },
      data: { status: newStatus },
    });

    await logAuditEvent({
      userId: admin.id,
      gymId: gymId,
      action: "GYM_STATUS_CHANGE",
      resource: "gym",
      resourceId: gymId,
      metadata: { newStatus, gymName: updated.name },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update status" };
  }
}

export async function updateGymSubscriptionAction(
  gymId: string,
  plan: SubscriptionPlan,
  status: SubscriptionStatus,
  price?: number
): Promise<AdminActionResult> {
  try {
    const { user: admin } = await requireSuperAdmin();

    const planPrices: Record<SubscriptionPlan, number> = {
      FREE: 0,
      STARTER: 1499,
      PRO: 3499,
      BUSINESS: 7999,
    };

    const finalPrice = price !== undefined ? price : planPrices[plan] || 0;
    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 86400000);

    await prisma.gymSubscription.upsert({
      where: { gymId },
      create: {
        gymId,
        plan,
        status,
        price: finalPrice,
        startDate: now,
        endDate,
      },
      update: {
        plan,
        status,
        price: finalPrice,
        endDate: status === "ACTIVE" ? endDate : undefined,
      },
    });

    await logAuditEvent({
      userId: admin.id,
      gymId: gymId,
      action: "SUBSCRIPTION_UPDATE",
      resource: "subscription",
      resourceId: gymId,
      metadata: { plan, status, price: finalPrice },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update subscription" };
  }
}

export async function deleteGymAction(gymId: string): Promise<AdminActionResult> {
  try {
    const { user: admin } = await requireSuperAdmin();

    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
      select: { id: true, name: true },
    });
    if (!gym) return { ok: false, error: "Gym not found" };

    // Soft delete gym
    await prisma.gym.update({
      where: { id: gymId },
      data: {
        deletedAt: new Date(),
        status: "DEACTIVATED",
      },
    });

    await logAuditEvent({
      userId: admin.id,
      gymId: gymId,
      action: "GYM_DELETE",
      resource: "gym",
      resourceId: gymId,
      metadata: { gymName: gym.name },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete gym" };
  }
}

export async function deleteGymPermanentAction(gymId: string): Promise<AdminActionResult> {
  try {
    const { user: admin } = await requireSuperAdmin();

    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
      include: {
        members: {
          select: {
            id: true,
            userId: true,
            user: { select: { role: true } },
          },
        },
      },
    });
    if (!gym) return { ok: false, error: "Gym not found" };

    const customerUserIds = gym.members
      .filter((m) => m.user?.role === "CUSTOMER")
      .map((m) => m.userId);

    await prisma.$transaction(async (tx) => {
      // Clean non-cascading or ordering-sensitive dependencies
      await tx.auditLog.deleteMany({ where: { gymId } });
      await tx.supportTicket.deleteMany({ where: { gymId } });
      await tx.invoice.deleteMany({ where: { gymId } });
      await tx.payment.deleteMany({ where: { gymId } });
      await tx.attendance.deleteMany({ where: { gymId } });
      await tx.classBooking.deleteMany({ where: { gymClass: { gymId } } });
      await tx.gymClass.deleteMany({ where: { gymId } });
      await tx.progressRecord.deleteMany({ where: { member: { gymId } } });
      await tx.workoutExercise.deleteMany({ where: { workoutPlan: { gymId } } });
      await tx.workoutPlan.deleteMany({ where: { gymId } });
      await tx.dietMeal.deleteMany({ where: { dietPlan: { gymId } } });
      await tx.dietPlan.deleteMany({ where: { gymId } });
      await tx.membership.deleteMany({ where: { gymId } });
      await tx.membershipPlan.deleteMany({ where: { gymId } });
      await tx.member.deleteMany({ where: { gymId } });
      await tx.trainer.deleteMany({ where: { gymId } });
      await tx.gymStaff.deleteMany({ where: { gymId } });
      await tx.gymSubscription.deleteMany({ where: { gymId } });
      await tx.gymSettings.deleteMany({ where: { gymId } });
      await tx.announcement.deleteMany({ where: { gymId } });
      await tx.notification.deleteMany({ where: { gymId } });
      await tx.notificationTemplate.deleteMany({ where: { gymId } });
      await tx.whatsAppLog.deleteMany({ where: { gymId } });
      await tx.whatsAppSettings.deleteMany({ where: { gymId } });
      await tx.equipment.deleteMany({ where: { gymId } });
      await tx.expense.deleteMany({ where: { gymId } });
      await tx.lead.deleteMany({ where: { gymId } });
      await tx.accessDevice.deleteMany({ where: { gymId } });

      // Delete the Gym
      await tx.gym.delete({ where: { id: gymId } });

      // Delete orphan customer accounts that belonged to this gym
      if (customerUserIds.length > 0) {
        await tx.auditLog.deleteMany({ where: { userId: { in: customerUserIds } } });
        await tx.supportTicket.deleteMany({ where: { userId: { in: customerUserIds } } });
        await tx.notification.deleteMany({ where: { userId: { in: customerUserIds } } });
        await tx.user.deleteMany({
          where: { id: { in: customerUserIds }, role: "CUSTOMER" },
        });
      }
    });

    await logAuditEvent({
      userId: admin.id,
      action: "GYM_PERMANENT_DELETE",
      resource: "gym",
      resourceId: gymId,
      metadata: { gymName: gym.name, gymCode: gym.gymCode },
    });

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to permanently delete gym",
    };
  }
}

export async function deleteMemberPermanentAction(memberId: string): Promise<AdminActionResult> {
  try {
    const { user: admin } = await requireSuperAdmin();

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        user: true,
        gym: { select: { id: true, name: true, gymCode: true } },
      },
    });
    if (!member) return { ok: false, error: "Member not found" };

    const userId = member.userId;
    const isCustomerUser = member.user?.role === "CUSTOMER";

    await prisma.$transaction(async (tx) => {
      // 1. Clean relations that reference member
      await tx.classBooking.deleteMany({ where: { memberId } });
      await tx.progressRecord.deleteMany({ where: { memberId } });
      await tx.workoutPlan.deleteMany({ where: { memberId } });
      await tx.dietPlan.deleteMany({ where: { memberId } });
      await tx.attendance.deleteMany({ where: { memberId } });
      await tx.invoice.deleteMany({ where: { payment: { memberId } } });
      await tx.payment.deleteMany({ where: { memberId } });
      await tx.membership.deleteMany({ where: { memberId } });

      // 2. Clean un-cascaded logs/tickets for this user
      await tx.auditLog.deleteMany({ where: { userId } });
      await tx.supportTicket.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });

      // 3. Delete the Member record
      await tx.member.delete({ where: { id: memberId } });

      // 4. Delete the User account if it is a pure CUSTOMER
      if (isCustomerUser) {
        await tx.user.delete({ where: { id: userId } });
      }
    });

    await logAuditEvent({
      userId: admin.id,
      gymId: member.gymId,
      action: "MEMBER_PERMANENT_DELETE",
      resource: "member",
      resourceId: memberId,
      metadata: {
        memberId: member.memberId,
        memberName: member.user?.name,
        gymName: member.gym?.name,
        gymCode: member.gym?.gymCode,
      },
    });

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to permanently delete member",
    };
  }
}

export async function deleteUserPermanentAction(userId: string): Promise<AdminActionResult> {
  try {
    const { user: admin } = await requireSuperAdmin();

    if (userId === admin.id) {
      return { ok: false, error: "You cannot delete your own Super Admin account." };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedGyms: { select: { id: true, name: true, gymCode: true } },
        member: { select: { id: true, memberId: true } },
        trainer: { select: { id: true } },
      },
    });

    if (!targetUser) return { ok: false, error: "User not found" };
    if (targetUser.role === "SUPER_ADMIN") {
      return { ok: false, error: "Cannot delete another Super Admin." };
    }
    if (targetUser.ownedGyms.length > 0) {
      return {
        ok: false,
        error: `This user owns gym "${targetUser.ownedGyms[0].name}" (${targetUser.ownedGyms[0].gymCode}). Please delete the gym first.`,
      };
    }

    await prisma.$transaction(async (tx) => {
      if (targetUser.member) {
        const memberId = targetUser.member.id;
        await tx.classBooking.deleteMany({ where: { memberId } });
        await tx.progressRecord.deleteMany({ where: { memberId } });
        await tx.workoutPlan.deleteMany({ where: { memberId } });
        await tx.dietPlan.deleteMany({ where: { memberId } });
        await tx.attendance.deleteMany({ where: { memberId } });
        await tx.invoice.deleteMany({ where: { payment: { memberId } } });
        await tx.payment.deleteMany({ where: { memberId } });
        await tx.membership.deleteMany({ where: { memberId } });
        await tx.member.delete({ where: { id: memberId } });
      }

      if (targetUser.trainer) {
        await tx.trainer.delete({ where: { id: targetUser.trainer.id } });
      }

      await tx.gymStaff.deleteMany({ where: { userId } });
      await tx.auditLog.deleteMany({ where: { userId } });
      await tx.supportTicket.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.account.deleteMany({ where: { userId } });
      await tx.session.deleteMany({ where: { userId } });

      await tx.user.delete({ where: { id: userId } });
    });

    await logAuditEvent({
      userId: admin.id,
      action: "USER_PERMANENT_DELETE",
      resource: "user",
      resourceId: userId,
      metadata: { deletedEmail: targetUser.email, deletedName: targetUser.name, role: targetUser.role },
    });

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to delete user",
    };
  }
}

// ── User Management ────────────────────────────────────────────

export async function toggleUserStatusAction(
  userId: string,
  newStatus: AccountStatus
): Promise<AdminActionResult> {
  try {
    const { user: admin } = await requireSuperAdmin();

    // Prevent self-suspension
    if (userId === admin.id) {
      return { ok: false, error: "You cannot suspend your own account." };
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: newStatus },
    });

    await logAuditEvent({
      userId: admin.id,
      action: "USER_STATUS_CHANGE",
      resource: "user",
      resourceId: userId,
      metadata: { newStatus, userEmail: updated.email },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update user status" };
  }
}

export async function forcePasswordResetAction(
  userId: string
): Promise<AdminActionResult> {
  try {
    const { user: admin } = await requireSuperAdmin();

    if (userId === admin.id) {
      return { ok: false, error: "You cannot force reset your own password from here." };
    }

    // Generate a temporary strong password
    const tempPassword = `XyroTemp_${Date.now().toString(36)}!`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        forcePasswordChange: true,
        loginAttempts: 0,
        lockedUntil: null,
      },
    });

    await logAuditEvent({
      userId: admin.id,
      action: "PASSWORD_FORCE_RESET",
      resource: "user",
      resourceId: userId,
      metadata: { userEmail: updated.email },
    });

    return {
      ok: true,
      data: {
        message: `Password has been reset. The user must change their password on next login.`,
        tempPassword,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to reset password" };
  }
}

// ── Platform Announcements ─────────────────────────────────────

export async function createAnnouncementAction(input: {
  title: string;
  content: string;
  priority: string;
  expiresInDays?: number;
}): Promise<AdminActionResult> {
  try {
    const { user: admin } = await requireSuperAdmin();

    if (!input.title.trim() || !input.content.trim()) {
      return { ok: false, error: "Title and content are required." };
    }

    const gyms = await prisma.gym.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      select: { id: true },
    });

    const expiresAt = input.expiresInDays
      ? new Date(Date.now() + input.expiresInDays * 86400000)
      : null;

    // Create one announcement per active gym
    await prisma.announcement.createMany({
      data: gyms.map((g) => ({
        gymId: g.id,
        title: input.title.trim(),
        content: input.content.trim(),
        priority: input.priority || "NORMAL",
        expiresAt,
        isActive: true,
      })),
    });

    await logAuditEvent({
      userId: admin.id,
      action: "ANNOUNCEMENT_CREATE",
      resource: "announcement",
      metadata: { title: input.title.trim(), gymsCount: gyms.length },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create announcement" };
  }
}

export async function deleteAnnouncementAction(
  announcementId: string
): Promise<AdminActionResult> {
  try {
    const { user: admin } = await requireSuperAdmin();

    await prisma.announcement.update({
      where: { id: announcementId },
      data: { isActive: false },
    });

    await logAuditEvent({
      userId: admin.id,
      action: "ANNOUNCEMENT_DELETE",
      resource: "announcement",
      resourceId: announcementId,
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete announcement" };
  }
}
