"use server";

import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
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
    await requireSuperAdmin();

    await prisma.gym.update({
      where: { id: gymId },
      data: { status: newStatus },
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
    await requireSuperAdmin();

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

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update subscription" };
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

    await prisma.user.update({
      where: { id: userId },
      data: { status: newStatus },
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

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        forcePasswordChange: true,
        loginAttempts: 0,
        lockedUntil: null,
      },
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
    await requireSuperAdmin();

    if (!input.title.trim() || !input.content.trim()) {
      return { ok: false, error: "Title and content are required." };
    }

    // Create a global announcement (no gymId = platform-wide)
    // We need a gymId for the relation — broadcast to ALL gyms
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

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create announcement" };
  }
}

export async function deleteAnnouncementAction(
  announcementId: string
): Promise<AdminActionResult> {
  try {
    await requireSuperAdmin();

    await prisma.announcement.update({
      where: { id: announcementId },
      data: { isActive: false },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete announcement" };
  }
}
