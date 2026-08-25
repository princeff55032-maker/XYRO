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
