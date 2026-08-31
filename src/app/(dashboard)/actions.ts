"use server";

import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { requireWorkspaceAuth } from "@/lib/tenant";
import { requirePermission } from "@/lib/permissions";
import { logAuditEvent } from "@/lib/audit";
import { generateMemberId } from "@/lib/utils";
import {
  addMemberSchema,
  membershipPlanSchema,
  paymentSchema,
  attendanceSchema,
  trainerSchema,
} from "@/lib/validations";
import {
  assertMemberQuota,
  assertTrainerQuota,
  assertPlanFeature,
  getGymSubscription,
} from "@/lib/subscriptions";
import { createDeviceApiKey } from "@/lib/device-auth";

export type ActionResult<T = unknown> = {
  ok: boolean;
  error?: string;
  data?: T;
};

export type MemberCredentials = {
  name: string;
  memberId: string;
  email: string;
  phone: string;
  password: string;
  gymName: string;
  gymCode: string;
};

export type TrainerCredentials = {
  name: string;
  email: string;
  phone: string;
  password: string;
  gymName: string;
  gymCode: string;
};

function message(e: unknown): string {
  if (e instanceof Error) {
    if (e.message.startsWith("EmailUnverified")) {
      return "Please verify your email address to perform this action.";
    }
    const msg = e.message.toLowerCase();
    if (
      msg.includes("unique constraint failed") ||
      msg.includes("unique constraint") ||
      msg.includes("p2002")
    ) {
      if (msg.includes("phone")) {
        return "A user with this phone number is already registered. Please use a unique phone number.";
      }
      if (msg.includes("email")) {
        return "A user with this email address is already registered. Please use a unique email.";
      }
      return "A user with these details is already registered.";
    }
    return e.message;
  }
  return "Something went wrong";
}

/* ------------------------------------------------------------------ */
/* Members                                                             */
/* ------------------------------------------------------------------ */

export async function addMemberAction(input: {
  name: string;
  email: string;
  phone: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  planId?: string;
  trainerId?: string;
}): Promise<ActionResult<MemberCredentials>> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "RECEPTIONIST", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );
    requirePermission(ctx, "members.create");

    const parsed = addMemberSchema.safeParse({
      ...input,
      dateOfBirth: input.dateOfBirth || undefined,
      gender: input.gender || undefined,
      planId: input.planId || undefined,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const data = parsed.data;
    const { gym } = ctx;

    // Verify the plan belongs to this gym (tenant isolation)
    let plan = null;
    if (data.planId) {
      plan = await prisma.membershipPlan.findFirst({
        where: { id: data.planId, gymId: gym.id, deletedAt: null },
      });
      if (!plan) return { ok: false, error: "Selected plan not found in this workspace" };
    }

    const emailTaken = await prisma.user.findUnique({ where: { email: data.email } });
    if (emailTaken) return { ok: false, error: "A user with this email already exists" };

    const phoneTaken = await prisma.user.findFirst({ where: { phone: data.phone } });
    if (phoneTaken) return { ok: false, error: "A user with this phone number already exists" };

    // Enforce dynamic member quota according to active subscription plan
    await assertMemberQuota(gym.id);

    const memberCount = await prisma.member.count({ where: { gymId: gym.id } });
    const memberId = generateMemberId(gym.gymCode, memberCount + 1);
    const rawPassword = `${data.phone.replace(/[^0-9]/g, "").slice(-4)}@xyro` || `${data.phone}@xyro`;
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    let createdMemberId: string = "";

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: passwordHash,
          role: "CUSTOMER",
          status: "ACTIVE",
        },
      });

      const member = await tx.member.create({
        data: {
          memberId,
          gymId: gym.id,
          userId: user.id,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          gender: (data.gender as "MALE" | "FEMALE" | "OTHER") ?? undefined,
          address: data.address,
          trainerId: data.trainerId || null,
          isActive: true,
        },
      });
      createdMemberId = member.id;

      // Optional: activate a membership immediately
      if (plan) {
        const start = new Date();
        const end = new Date(start.getTime() + plan.durationDays * 86400000);
        const membership = await tx.membership.create({
          data: {
            gymId: gym.id,
            memberId: member.id,
            planId: plan.id,
            status: "ACTIVE",
            startDate: start,
            endDate: end,
            daysRemaining: plan.durationDays,
            autoRenew: false,
          },
        });
        await tx.payment.create({
          data: {
            gymId: gym.id,
            memberId: member.id,
            membershipId: membership.id,
            amount: plan.price,
            tax: 0,
            discount: 0,
            totalAmount: plan.price,
            status: "PAID",
            method: "CASH",
            paidAt: new Date(),
            notes: `New membership — ${plan.name}`,
          },
        });
      }
    });

    await logAuditEvent({
      userId: ctx.user.id,
      gymId: ctx.gym.id,
      action: "MEMBER_CREATE",
      resource: "member",
      resourceId: createdMemberId,
      metadata: { name: data.name, memberId, email: data.email },
    });

    return {
      ok: true,
      data: {
        name: data.name,
        memberId,
        email: data.email,
        phone: data.phone,
        password: rawPassword,
        gymName: gym.name,
        gymCode: gym.gymCode,
      },
    };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function toggleMemberActiveAction(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "RECEPTIONIST", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );
    requirePermission(ctx, "members.edit");

    const member = await prisma.member.findFirst({ where: { id, gymId: ctx.gym.id } });
    if (!member) return { ok: false, error: "Member not found" };

    const updated = await prisma.member.update({
      where: { id },
      data: { isActive: !member.isActive },
    });

    await logAuditEvent({
      userId: ctx.user.id,
      gymId: ctx.gym.id,
      action: "MEMBER_STATUS_TOGGLE",
      resource: "member",
      resourceId: id,
      metadata: { isActive: updated.isActive },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function removeMemberAction(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );
    requirePermission(ctx, "members.delete");

    const member = await prisma.member.findFirst({
      where: { id, gymId: ctx.gym.id, deletedAt: null },
    });
    if (!member) return { ok: false, error: "Member not found" };

    // Soft delete member
    await prisma.member.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    await logAuditEvent({
      userId: ctx.user.id,
      gymId: ctx.gym.id,
      action: "MEMBER_DELETE",
      resource: "member",
      resourceId: id,
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export type ImportMemberRow = {
  name: string;
  phone: string;
  email?: string;
  planName?: string;
  startDate?: string;
  expiryDate?: string;
  amount?: string | number;
  paymentStatus?: string;
  trainerName?: string;
  gender?: string;
  address?: string;
};

export type ImportResult = {
  total: number;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; name: string; phone: string; error: string }>;
};

export async function importGymDataAction(
  rows: ImportMemberRow[]
): Promise<ActionResult<ImportResult>> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );
    requirePermission(ctx, "members.create");
    const { gym } = ctx;
    const { config: planConfig } = await getGymSubscription(gym.id);
    let currentMemberCount = await prisma.member.count({ where: { gymId: gym.id, deletedAt: null } });

    let imported = 0;
    let skipped = 0;
    const errors: Array<{ row: number; name: string; phone: string; error: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 1;

      if (!row.name || !row.name.trim() || !row.phone || !row.phone.trim()) {
        errors.push({
          row: rowIndex,
          name: row.name || "Unknown",
          phone: row.phone || "Missing",
          error: "Name and Phone are mandatory fields.",
        });
        continue;
      }

      // Check plan member limit dynamically
      if (currentMemberCount >= planConfig.maxMembers) {
        errors.push({
          row: rowIndex,
          name: row.name,
          phone: row.phone,
          error: `${planConfig.name} athlete limit reached (${planConfig.maxMembers} max). Upgrade your plan to import more records.`,
        });
        continue;
      }

      const cleanPhone = row.phone.trim();
      const cleanEmail = row.email?.trim() || `${cleanPhone.replace(/[^0-9]/g, "")}@xyro.local`;

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ phone: cleanPhone }, { email: cleanEmail }],
        },
      });

      if (existingUser) {
        // Check if already in this gym
        const existingMember = await prisma.member.findFirst({
          where: { userId: existingUser.id, gymId: gym.id },
        });
        if (existingMember) {
          skipped++;
          continue;
        }
      }

      try {
        currentMemberCount++;
        const memberId = generateMemberId(gym.gymCode, currentMemberCount);
        const rawPassword = `${cleanPhone.replace(/[^0-9]/g, "").slice(-4)}@xyro` || `${cleanPhone}@xyro`;
        const passwordHash = await bcrypt.hash(rawPassword, 10);

        await prisma.$transaction(async (tx) => {
          let user = existingUser;
          if (!user) {
            user = await tx.user.create({
              data: {
                name: row.name.trim(),
                email: cleanEmail,
                phone: cleanPhone,
                password: passwordHash,
                role: "CUSTOMER",
                status: "ACTIVE",
              },
            });
          }

          const member = await tx.member.create({
            data: {
              memberId,
              gymId: gym.id,
              userId: user.id,
              address: row.address?.trim() || null,
              gender: (row.gender?.toUpperCase() as "MALE" | "FEMALE" | "OTHER") || undefined,
              isActive: true,
            },
          });

          // If plan specified, link plan & membership
          if (row.planName && row.planName.trim()) {
            let plan = await tx.membershipPlan.findFirst({
              where: {
                gymId: gym.id,
                name: { equals: row.planName.trim(), mode: "insensitive" },
                deletedAt: null,
              },
            });

            if (!plan) {
              const priceNum = Number(row.amount) || 2499;
              plan = await tx.membershipPlan.create({
                data: {
                  gymId: gym.id,
                  name: row.planName.trim(),
                  price: priceNum,
                  durationDays: 30,
                  sortOrder: 0,
                },
              });
            }

            const start = row.startDate ? new Date(row.startDate) : new Date();
            const end = row.expiryDate ? new Date(row.expiryDate) : new Date(start.getTime() + plan.durationDays * 86400000);
            const now = new Date();

            const membership = await tx.membership.create({
              data: {
                gymId: gym.id,
                memberId: member.id,
                planId: plan.id,
                status: end >= now ? "ACTIVE" : "EXPIRED",
                startDate: start,
                endDate: end,
                daysRemaining: Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000)),
                autoRenew: false,
              },
            });

            if (row.amount !== undefined) {
              const amountNum = Number(row.amount) || plan.price;
              await tx.payment.create({
                data: {
                  gymId: gym.id,
                  memberId: member.id,
                  membershipId: membership.id,
                  amount: amountNum,
                  tax: 0,
                  discount: 0,
                  totalAmount: amountNum,
                  status: (row.paymentStatus?.toUpperCase() as never) || "PAID",
                  method: "CASH",
                  paidAt: start,
                  notes: `Imported via Migration CSV — ${plan.name}`,
                },
              });
            }
          }
        });

        imported++;
      } catch (err) {
        errors.push({
          row: rowIndex,
          name: row.name,
          phone: row.phone,
          error: err instanceof Error ? err.message : "Database transaction failed",
        });
      }
    }

    await logAuditEvent({
      userId: ctx.user.id,
      gymId: ctx.gym.id,
      action: "MEMBERS_BATCH_IMPORT",
      resource: "member",
      metadata: { total: rows.length, imported, skipped, errorsCount: errors.length },
    });

    return {
      ok: true,
      data: {
        total: rows.length,
        imported,
        skipped,
        errors,
      },
    };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function assignPlanToMemberAction(input: {
  memberId: string;
  planId: string;
  paymentMethod?: string;
  notes?: string;
}): Promise<ActionResult> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "RECEPTIONIST", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );
    requirePermission(ctx, "members.edit");
    const { gym } = ctx;

    const member = await prisma.member.findFirst({
      where: { id: input.memberId, gymId: gym.id, deletedAt: null },
      include: { user: true },
    });
    if (!member) return { ok: false, error: "Member not found" };

    const plan = await prisma.membershipPlan.findFirst({
      where: { id: input.planId, gymId: gym.id, deletedAt: null, isActive: true },
    });
    if (!plan) return { ok: false, error: "Membership plan not found or inactive" };

    await prisma.$transaction(async (tx) => {
      const now = new Date();
      const existing = await tx.membership.findFirst({
        where: { memberId: member.id, gymId: gym.id, status: "ACTIVE" },
        orderBy: { endDate: "desc" },
      });

      const startDate = existing && existing.endDate > now ? existing.endDate : now;
      const endDate = new Date(startDate.getTime() + plan.durationDays * 86400000);

      const membership = await tx.membership.create({
        data: {
          gymId: gym.id,
          memberId: member.id,
          planId: plan.id,
          status: "ACTIVE",
          startDate,
          endDate,
          daysRemaining: Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 86400000)),
          autoRenew: false,
        },
      });

      // Automatically record in payment ledger
      await tx.payment.create({
        data: {
          gymId: gym.id,
          memberId: member.id,
          membershipId: membership.id,
          amount: plan.price,
          tax: 0,
          discount: 0,
          totalAmount: plan.price,
          status: "PAID",
          method: (input.paymentMethod as never) || "CASH",
          paidAt: new Date(),
          notes: input.notes || `Plan Assigned — ${plan.name}`,
        },
      });
    });

    await logAuditEvent({
      userId: ctx.user.id,
      gymId: ctx.gym.id,
      action: "PLAN_ASSIGN",
      resource: "member",
      resourceId: member.id,
      metadata: { planName: plan.name, price: plan.price },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

/* ------------------------------------------------------------------ */
/* Membership plans                                                    */
/* ------------------------------------------------------------------ */

export async function addPlanAction(input: {
  name: string;
  description?: string;
  durationDays: string | number;
  price: string | number;
  features?: string;
  freezeDays?: string | number;
  classesIncluded?: boolean;
  personalTraining?: boolean;
}): Promise<ActionResult> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );
    requirePermission(ctx, "settings.manage");

    const parsed = membershipPlanSchema.safeParse({
      name: input.name,
      description: input.description || undefined,
      durationDays: Number(input.durationDays),
      price: Number(input.price),
      features: input.features
        ? input.features.split(",").map((f) => f.trim()).filter(Boolean)
        : [],
      freezeDays: Number(input.freezeDays ?? 0),
      classesIncluded: input.classesIncluded ?? false,
      personalTraining: input.personalTraining ?? false,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid plan" };
    }
    const data = parsed.data;

    const createdPlan = await prisma.membershipPlan.create({
      data: { ...data, gymId: ctx.gym.id, sortOrder: 0 },
    });

    await logAuditEvent({
      userId: ctx.user.id,
      gymId: ctx.gym.id,
      action: "PLAN_CREATE",
      resource: "membership_plan",
      resourceId: createdPlan.id,
      metadata: { name: createdPlan.name, price: createdPlan.price },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function deactivatePlanAction(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );
    requirePermission(ctx, "settings.manage");

    const plan = await prisma.membershipPlan.findFirst({
      where: { id, gymId: ctx.gym.id },
    });
    if (!plan) return { ok: false, error: "Plan not found" };

    await prisma.membershipPlan.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await logAuditEvent({
      userId: ctx.user.id,
      gymId: ctx.gym.id,
      action: "PLAN_DEACTIVATE",
      resource: "membership_plan",
      resourceId: id,
      metadata: { name: plan.name },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

/* ------------------------------------------------------------------ */
/* Payments                                                            */
/* ------------------------------------------------------------------ */

export async function recordPaymentAction(input: {
  memberId: string;
  amount: string | number;
  method: string;
  planId?: string;
  notes?: string;
}): Promise<ActionResult> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "RECEPTIONIST", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );
    requirePermission(ctx, "payments.create");

    const parsed = paymentSchema.safeParse({
      memberId: input.memberId,
      amount: Number(input.amount),
      tax: 0,
      discount: 0,
      method: input.method,
      status: "PAID",
      notes: input.notes || undefined,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payment" };
    }
    const data = parsed.data;
    const { gym } = ctx;

    const member = await prisma.member.findFirst({
      where: { id: data.memberId, gymId: gym.id },
    });
    if (!member) return { ok: false, error: "Member not found" };

    let membershipId: string | undefined;

    await prisma.$transaction(async (tx) => {
      if (input.planId) {
        const plan = await tx.membershipPlan.findFirst({
          where: { id: input.planId, gymId: gym.id, deletedAt: null },
        });
        if (plan) {
          const now = new Date();
          const existing = await tx.membership.findFirst({
            where: { memberId: member.id, gymId: gym.id, status: "ACTIVE" },
            orderBy: { endDate: "desc" },
          });
          const startDate = existing && existing.endDate > now ? existing.endDate : now;
          const endDate = new Date(startDate.getTime() + plan.durationDays * 86400000);

          const membership = await tx.membership.create({
            data: {
              gymId: gym.id,
              memberId: member.id,
              planId: plan.id,
              status: "ACTIVE",
              startDate,
              endDate,
              daysRemaining: Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 86400000)),
              autoRenew: false,
            },
          });
          membershipId = membership.id;
        }
      }

      await tx.payment.create({
        data: {
          gymId: gym.id,
          memberId: member.id,
          membershipId: membershipId ?? null,
          amount: data.amount,
          tax: 0,
          discount: 0,
          totalAmount: data.amount,
          status: "PAID",
          method: data.method as never,
          paidAt: new Date(),
          notes: data.notes,
        },
      });
    });

    await logAuditEvent({
      userId: ctx.user.id,
      gymId: ctx.gym.id,
      action: "PAYMENT_CREATE",
      resource: "payment",
      metadata: { memberId: data.memberId, amount: data.amount, method: data.method },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function updatePaymentAction(input: {
  paymentId: string;
  amount: number | string;
  method: string;
  status: string;
  notes?: string;
  paidAt?: string;
}): Promise<ActionResult> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "RECEPTIONIST", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );
    requirePermission(ctx, "payments.edit");

    const payment = await prisma.payment.findFirst({
      where: { id: input.paymentId, gymId: ctx.gym.id },
    });
    if (!payment) return { ok: false, error: "Payment record not found" };

    const amountNum = Number(input.amount);
    if (isNaN(amountNum) || amountNum < 0) {
      return { ok: false, error: "Please enter a valid payment amount" };
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        amount: amountNum,
        totalAmount: amountNum,
        method: input.method as never,
        status: input.status as never,
        notes: input.notes ?? null,
        paidAt: input.paidAt ? new Date(input.paidAt) : payment.paidAt,
      },
    });

    await logAuditEvent({
      userId: ctx.user.id,
      gymId: ctx.gym.id,
      action: "PAYMENT_UPDATE",
      resource: "payment",
      resourceId: payment.id,
      metadata: { amount: amountNum, status: input.status },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function voidPaymentAction(input: {
  paymentId: string;
  reason: string;
}): Promise<ActionResult> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );
    requirePermission(ctx, "payments.refund");

    const payment = await prisma.payment.findFirst({
      where: { id: input.paymentId, gymId: ctx.gym.id },
    });
    if (!payment) return { ok: false, error: "Payment record not found" };

    const before = { status: payment.status, amount: payment.totalAmount };

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        notes: payment.notes ? `${payment.notes} | [VOIDED: ${input.reason}]` : `[VOIDED: ${input.reason}]`,
      },
    });

    await logAuditEvent({
      userId: ctx.user.id,
      gymId: ctx.gym.id,
      action: "PAYMENT_VOID",
      resource: "payment",
      resourceId: input.paymentId,
      before,
      after: { status: "VOIDED", reason: input.reason },
      metadata: { reason: input.reason },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function refundPaymentAction(input: {
  paymentId: string;
  reason: string;
}): Promise<ActionResult> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );
    requirePermission(ctx, "payments.refund");

    const payment = await prisma.payment.findFirst({
      where: { id: input.paymentId, gymId: ctx.gym.id },
    });
    if (!payment) return { ok: false, error: "Payment record not found" };

    const before = { status: payment.status, amount: payment.totalAmount };

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "REFUNDED",
        notes: payment.notes ? `${payment.notes} | [REFUNDED: ${input.reason}]` : `[REFUNDED: ${input.reason}]`,
      },
    });

    await logAuditEvent({
      userId: ctx.user.id,
      gymId: ctx.gym.id,
      action: "PAYMENT_REFUND",
      resource: "payment",
      resourceId: input.paymentId,
      before,
      after: { status: "REFUNDED", reason: input.reason },
      metadata: { amount: payment.totalAmount, reason: input.reason },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function deletePaymentAction(input: {
  paymentId: string;
}): Promise<ActionResult> {
  return voidPaymentAction({ paymentId: input.paymentId, reason: "Archived by Administrator" });
}

/* ------------------------------------------------------------------ */
/* Attendance                                                          */
/* ------------------------------------------------------------------ */

export async function recordAttendanceAction(input: {
  memberId: string;
  method?: string;
  notes?: string;
}): Promise<ActionResult> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "TRAINER", "RECEPTIONIST", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );

    const parsed = attendanceSchema.safeParse({
      memberId: input.memberId,
      method: input.method ?? "MANUAL",
      notes: input.notes || undefined,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid check-in" };
    }
    const data = parsed.data;
    const { gym, user } = ctx;

    const member = await prisma.member.findFirst({
      where: { id: data.memberId, gymId: gym.id, isActive: true },
    });
    if (!member) return { ok: false, error: "Active member not found" };

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 86400000);

    const already = await prisma.attendance.findFirst({
      where: {
        gymId: gym.id,
        memberId: member.id,
        date: { gte: dayStart, lt: dayEnd },
      },
    });
    if (already) return { ok: false, error: "Already checked in today" };

    await prisma.attendance.create({
      data: {
        gymId: gym.id,
        memberId: member.id,
        date: dayStart,
        checkIn: new Date(),
        method: data.method as never,
        staffId: user.id,
        notes: data.notes,
      },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

/* ------------------------------------------------------------------ */
/* Trainers                                                            */
/* ------------------------------------------------------------------ */

export async function addTrainerAction(input: {
  name: string;
  email: string;
  phone: string;
  specialization?: string;
  experience?: string;
  bio?: string;
}): Promise<ActionResult<TrainerCredentials>> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );
    requirePermission(ctx, "trainers.manage");

    const parsed = trainerSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid trainer" };
    }
    const data = parsed.data;

    // Enforce trainer quota by subscription tier
    await assertTrainerQuota(ctx.gym.id);

    const emailTaken = await prisma.user.findUnique({ where: { email: data.email } });
    if (emailTaken) return { ok: false, error: "A user with this email already exists" };

    const phoneTaken = await prisma.user.findFirst({ where: { phone: data.phone } });
    if (phoneTaken) return { ok: false, error: "A user with this phone number already exists" };

    const rawPassword = `${data.phone.replace(/[^0-9]/g, "").slice(-4)}@xyro` || `${data.phone}@xyro`;
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: passwordHash,
        role: "TRAINER",
        status: "ACTIVE",
      },
    });

    const trainer = await prisma.trainer.create({
      data: {
        gymId: ctx.gym.id,
        userId: user.id,
        specialization: data.specialization,
        experience: data.experience,
        bio: data.bio,
      },
    });

    await logAuditEvent({
      userId: ctx.user.id,
      gymId: ctx.gym.id,
      action: "TRAINER_CREATE",
      resource: "trainer",
      resourceId: trainer.id,
      metadata: { name: data.name, email: data.email },
    });

    return {
      ok: true,
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: rawPassword,
        gymName: ctx.gym.name,
        gymCode: ctx.gym.gymCode,
      },
    };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function toggleTrainerActiveAction(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );
    requirePermission(ctx, "trainers.manage");

    const trainer = await prisma.trainer.findFirst({
      where: { id, gymId: ctx.gym.id },
    });
    if (!trainer) return { ok: false, error: "Trainer not found" };

    const updated = await prisma.trainer.update({
      where: { id },
      data: { isActive: !trainer.isActive },
    });

    await logAuditEvent({
      userId: ctx.user.id,
      gymId: ctx.gym.id,
      action: "TRAINER_STATUS_TOGGLE",
      resource: "trainer",
      resourceId: id,
      metadata: { isActive: updated.isActive },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function removeTrainerAction(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );
    requirePermission(ctx, "trainers.manage");

    const trainer = await prisma.trainer.findFirst({
      where: { id, gymId: ctx.gym.id, deletedAt: null },
    });
    if (!trainer) return { ok: false, error: "Trainer not found" };

    // Unassign trainer from any members
    await prisma.member.updateMany({
      where: { trainerId: id, gymId: ctx.gym.id },
      data: { trainerId: null },
    });

    // Soft delete trainer
    await prisma.trainer.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    await logAuditEvent({
      userId: ctx.user.id,
      gymId: ctx.gym.id,
      action: "TRAINER_DELETE",
      resource: "trainer",
      resourceId: id,
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function assignMemberToTrainerAction(input: {
  memberId: string;
  trainerId?: string | null;
}): Promise<ActionResult> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );
    requirePermission(ctx, "trainers.manage");

    const member = await prisma.member.findFirst({
      where: { id: input.memberId, gymId: ctx.gym.id },
    });
    if (!member) return { ok: false, error: "Member not found in this workspace" };

    await prisma.member.update({
      where: { id: member.id },
      data: { trainerId: input.trainerId ?? null },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function assignMultipleMembersToTrainerAction(input: {
  trainerId: string;
  memberIds: string[];
}): Promise<ActionResult> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );
    requirePermission(ctx, "trainers.manage");

    const trainer = await prisma.trainer.findFirst({
      where: { id: input.trainerId, gymId: ctx.gym.id, deletedAt: null },
    });
    if (!trainer) return { ok: false, error: "Trainer not found in this workspace" };

    // 1. Unassign members who were previously assigned to this trainer but not in memberIds
    await prisma.member.updateMany({
      where: {
        gymId: ctx.gym.id,
        trainerId: trainer.id,
        id: { notIn: input.memberIds },
      },
      data: { trainerId: null },
    });

    // 2. Assign the selected members to this trainer
    if (input.memberIds.length > 0) {
      await prisma.member.updateMany({
        where: {
          gymId: ctx.gym.id,
          id: { in: input.memberIds },
        },
        data: { trainerId: trainer.id },
      });
    }

    await logAuditEvent({
      userId: ctx.user.id,
      gymId: ctx.gym.id,
      action: "TRAINER_ROSTER_ASSIGN",
      resource: "trainer",
      resourceId: trainer.id,
      metadata: { memberIds: input.memberIds },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

/* ------------------------------------------------------------------ */
/* Workout & diet plans                                                */
/* ------------------------------------------------------------------ */

export async function addWorkoutPlanAction(input: {
  memberId: string;
  name: string;
  description?: string;
  exercises: string; // lines: "MON | Bench Press | 4 | 8-12 | 60kg"
}): Promise<ActionResult> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "TRAINER", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );
    requirePermission(ctx, "workouts.manage");
    await assertPlanFeature(ctx.gym.id, "workouts_and_diets");

    const member = await prisma.member.findFirst({
      where: { id: input.memberId, gymId: ctx.gym.id },
    });
    if (!member) return { ok: false, error: "Member not found" };

    // Strict Trainer Permission: Trainer can only assign to members assigned to them
    if (ctx.user.role === "TRAINER") {
      const trainer = await prisma.trainer.findUnique({
        where: { userId: ctx.user.id },
      });
      if (!trainer || member.trainerId !== trainer.id) {
        return {
          ok: false,
          error: "Permission denied: You can only assign workout plans to members assigned to you.",
        };
      }
    }

    const exercises = input.exercises
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [dayOfWeek = "MON", exerciseName = "", sets = "3", reps = "10", weight = ""] =
          line.split("|").map((p) => p.trim());
        return {
          dayOfWeek: dayOfWeek.toUpperCase().slice(0, 3),
          exerciseName,
          sets: Number(sets) || 3,
          reps,
          weight: weight || null,
        };
      })
      .filter((e) => e.exerciseName);

    if (exercises.length === 0) {
      return { ok: false, error: "Add at least one exercise line" };
    }

    const createdWorkout = await prisma.workoutPlan.create({
      data: {
        gymId: ctx.gym.id,
        memberId: member.id,
        name: input.name,
        description: input.description || null,
        isActive: true,
        exercises: { create: exercises },
      },
    });

    await logAuditEvent({
      userId: ctx.user.id,
      gymId: ctx.gym.id,
      action: "WORKOUT_PLAN_CREATE",
      resource: "workout_plan",
      resourceId: createdWorkout.id,
      metadata: { memberId: member.id, name: input.name },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function addDietPlanAction(input: {
  memberId: string;
  name: string;
  description?: string;
  totalCalories?: string;
  meals: string; // lines: "BREAKFAST | 08:00 | Oats, Milk, Banana | 450"
}): Promise<ActionResult> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "TRAINER", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );
    requirePermission(ctx, "diets.manage");
    await assertPlanFeature(ctx.gym.id, "workouts_and_diets");

    const member = await prisma.member.findFirst({
      where: { id: input.memberId, gymId: ctx.gym.id },
    });
    if (!member) return { ok: false, error: "Member not found" };

    // Strict Trainer Permission: Trainer can only assign to members assigned to them
    if (ctx.user.role === "TRAINER") {
      const trainer = await prisma.trainer.findUnique({
        where: { userId: ctx.user.id },
      });
      if (!trainer || member.trainerId !== trainer.id) {
        return {
          ok: false,
          error: "Permission denied: You can only assign diet plans to members assigned to you.",
        };
      }
    }

    const meals = input.meals
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [mealType = "MEAL", time = "", foodItems = "", calories = ""] =
          line.split("|").map((p) => p.trim());
        return {
          mealType: mealType.toUpperCase(),
          time: time || null,
          foodItems,
          calories: calories ? Number(calories) : null,
        };
      })
      .filter((m) => m.foodItems);

    if (meals.length === 0) {
      return { ok: false, error: "Add at least one meal line" };
    }

    const createdDiet = await prisma.dietPlan.create({
      data: {
        gymId: ctx.gym.id,
        memberId: member.id,
        name: input.name,
        description: input.description || null,
        totalCalories: input.totalCalories ? Number(input.totalCalories) : null,
        isActive: true,
        meals: { create: meals },
      },
    });

    await logAuditEvent({
      userId: ctx.user.id,
      gymId: ctx.gym.id,
      action: "DIET_PLAN_CREATE",
      resource: "diet_plan",
      resourceId: createdDiet.id,
      metadata: { memberId: member.id, name: input.name },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export async function updateGymSettingsAction(input: {
  name: string;
  phone: string;
  email: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  gstNumber?: string;
  description?: string;
}): Promise<ActionResult> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );
    requirePermission(ctx, "settings.manage");

    if (!input.name || !input.phone || !input.email) {
      return { ok: false, error: "Name, phone and email are required" };
    }

    await prisma.gym.update({
      where: { id: ctx.gym.id },
      data: {
        name: input.name.trim(),
        phone: input.phone.trim(),
        email: input.email.trim(),
        address: input.address?.trim() || null,
        city: input.city?.trim() || null,
        state: input.state?.trim() || null,
        country: input.country?.trim() || "India",
        gstNumber: input.gstNumber?.trim() || null,
        description: input.description?.trim() || null,
      },
    });

    await logAuditEvent({
      userId: ctx.user.id,
      gymId: ctx.gym.id,
      action: "SETTINGS_PROFILE_UPDATE",
      resource: "gym",
      resourceId: ctx.gym.id,
      metadata: { name: input.name.trim() },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function updateGymPreferencesAction(input: {
  timezone?: string;
  currency?: string;
  currencySymbol?: string;
  dateFormat?: string;
  openingTime?: string;
  closingTime?: string;
  workingDays?: string[];
  enableQrCheckin?: boolean;
  enableWhatsapp?: boolean;
  enableEmail?: boolean;
  enableSms?: boolean;
  expiryReminder30Days?: boolean;
  expiryReminder15Days?: boolean;
  expiryReminder7Days?: boolean;
  expiryReminder3Days?: boolean;
  expiryReminder1Day?: boolean;
  autoSuspendOnExpiry?: boolean;
}): Promise<ActionResult> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );
    requirePermission(ctx, "settings.manage");

    if (input.enableWhatsapp) {
      await assertPlanFeature(ctx.gym.id, "whatsapp_automations");
    }

    await prisma.gymSettings.upsert({
      where: { gymId: ctx.gym.id },
      create: {
        gymId: ctx.gym.id,
        ...input,
      },
      update: {
        ...input,
      },
    });

    await logAuditEvent({
      userId: ctx.user.id,
      gymId: ctx.gym.id,
      action: "SETTINGS_PREFERENCES_UPDATE",
      resource: "gym_settings",
      resourceId: ctx.gym.id,
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

/* ------------------------------------------------------------------ */
/* Group Classes                                                       */
/* ------------------------------------------------------------------ */

export async function addClassAction(input: {
  name: string;
  description?: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  maxCapacity?: number | string;
  trainerId?: string;
}): Promise<ActionResult> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );
    await assertPlanFeature(ctx.gym.id, "group_classes");

    if (!input.name || !input.dayOfWeek || !input.startTime || !input.endTime) {
      return { ok: false, error: "Class name, day, start, and end times are required." };
    }

    await prisma.gymClass.create({
      data: {
        gymId: ctx.gym.id,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        dayOfWeek: input.dayOfWeek.toUpperCase(),
        startTime: input.startTime,
        endTime: input.endTime,
        maxCapacity: Number(input.maxCapacity) || 20,
        trainerId: input.trainerId || null,
        isActive: true,
      },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function deleteClassAction(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );

    const gymClass = await prisma.gymClass.findFirst({
      where: { id, gymId: ctx.gym.id },
    });
    if (!gymClass) return { ok: false, error: "Class not found" };

    await prisma.gymClass.delete({ where: { id } });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

/* ------------------------------------------------------------------ */
/* Leads & CRM                                                         */
/* ------------------------------------------------------------------ */

export async function createLeadAction(input: {
  gymId?: string;
  name: string;
  email?: string;
  phone: string;
  source?: string;
  notes?: string;
  trialDate?: string;
}): Promise<ActionResult> {
  try {
    let gymId = input.gymId;

    if (!gymId) {
      const ctx = await requireWorkspaceAuth(
        ["GYM_OWNER", "GYM_ADMIN", "RECEPTIONIST", "SUPER_ADMIN"],
        { requireEmailVerified: false }
      );
      gymId = ctx.gym.id;
    }

    if (!input.name || !input.phone) {
      return { ok: false, error: "Name and phone number are required." };
    }

    await prisma.lead.create({
      data: {
        gymId,
        name: input.name.trim(),
        email: input.email?.trim() || null,
        phone: input.phone.trim(),
        source: input.source || "WEBSITE_TRIAL",
        status: "NEW",
        trialDate: input.trialDate ? new Date(input.trialDate) : null,
        notes: input.notes?.trim() || null,
      },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function updateLeadStatusAction(
  id: string,
  status: string,
  notes?: string
): Promise<ActionResult> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "RECEPTIONIST", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );

    const lead = await prisma.lead.findFirst({ where: { id, gymId: ctx.gym.id } });
    if (!lead) return { ok: false, error: "Lead not found" };

    await prisma.lead.update({
      where: { id },
      data: {
        status,
        ...(notes !== undefined && { notes }),
      },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function convertLeadToMemberAction(input: {
  leadId: string;
  planId?: string;
}): Promise<ActionResult<MemberCredentials>> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );

    const lead = await prisma.lead.findFirst({
      where: { id: input.leadId, gymId: ctx.gym.id },
    });
    if (!lead) return { ok: false, error: "Lead not found" };

    const email = lead.email || `${lead.phone.replace(/[^0-9]/g, "")}@xyro.local`;

    const res = await addMemberAction({
      name: lead.name,
      email,
      phone: lead.phone,
      planId: input.planId,
    });

    if (res.ok) {
      await prisma.lead.update({
        where: { id: input.leadId },
        data: { status: "CONVERTED" },
      });
    }

    return res;
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

/* ------------------------------------------------------------------ */
/* Access Control & Scanner Devices                                   */
/* ------------------------------------------------------------------ */

export type AccessDeviceResult = {
  id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export async function createAccessDeviceAction(
  name: string
): Promise<ActionResult<{ apiKey: string; keyPrefix: string; device: AccessDeviceResult }>> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );
    requirePermission(ctx, "access_control.manage");

    if (!name || !name.trim()) {
      return { ok: false, error: "Device name is required (e.g. 'Turnstile Gate 1')." };
    }

    const { apiKey, keyPrefix, device } = await createDeviceApiKey({
      gymId: ctx.gym.id,
      name: name.trim(),
    });

    await logAuditEvent({
      userId: ctx.user.id,
      gymId: ctx.gym.id,
      action: "ACCESS_DEVICE_CREATE",
      resource: "access_device",
      resourceId: device.id,
      metadata: { name: device.name, keyPrefix },
    });

    return {
      ok: true,
      data: {
        apiKey,
        keyPrefix,
        device: {
          id: device.id,
          name: device.name,
          keyPrefix: device.keyPrefix,
          isActive: device.isActive,
          lastUsedAt: device.lastUsedAt ? device.lastUsedAt.toISOString() : null,
          revokedAt: device.revokedAt ? device.revokedAt.toISOString() : null,
          createdAt: device.createdAt.toISOString(),
        },
      },
    };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function revokeAccessDeviceAction(deviceId: string): Promise<ActionResult> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );
    requirePermission(ctx, "access_control.manage");

    const device = await prisma.accessDevice.findFirst({
      where: { id: deviceId, gymId: ctx.gym.id },
    });

    if (!device) {
      return { ok: false, error: "Access device not found." };
    }

    await prisma.accessDevice.update({
      where: { id: deviceId },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    await logAuditEvent({
      userId: ctx.user.id,
      gymId: ctx.gym.id,
      action: "ACCESS_DEVICE_REVOKE",
      resource: "access_device",
      resourceId: deviceId,
      metadata: { name: device.name },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function listAccessDevicesAction(): Promise<ActionResult<AccessDeviceResult[]>> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "SUPER_ADMIN"],
      { requireEmailVerified: false }
    );
    requirePermission(ctx, "access_control.manage");

    const devices = await prisma.accessDevice.findMany({
      where: { gymId: ctx.gym.id },
      orderBy: { createdAt: "desc" },
    });

    return {
      ok: true,
      data: devices.map((d) => ({
        id: d.id,
        name: d.name,
        keyPrefix: d.keyPrefix,
        isActive: d.isActive,
        lastUsedAt: d.lastUsedAt ? d.lastUsedAt.toISOString() : null,
        revokedAt: d.revokedAt ? d.revokedAt.toISOString() : null,
        createdAt: d.createdAt.toISOString(),
      })),
    };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

/* ------------------------------------------------------------------ */
/* Secure Data Export                                                 */
/* ------------------------------------------------------------------ */

export type ExportResourceType = "members" | "payments" | "attendance" | "trainers";

export async function exportTenantDataAction(
  resource: ExportResourceType
): Promise<ActionResult<{ filename: string; rows: Record<string, unknown>[] }>> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );
    requirePermission(ctx, "exports.manage");

    // Rate Limit: 10 exports per 15 minutes per user
    const rl = await import("@/lib/ratelimit").then((m) =>
      m.checkRateLimit(`export:${ctx.user.id}`, 10, 15 * 60)
    );
    if (!rl.success) {
      return {
        ok: false,
        error: `Export rate limit reached. Please wait ${Math.ceil(rl.retryAfterSeconds / 60)} minutes before exporting again.`,
      };
    }

    let rows: Record<string, unknown>[] = [];
    const dateStr = new Date().toISOString().split("T")[0];

    if (resource === "members") {
      const members = await prisma.member.findMany({
        where: { gymId: ctx.gym.id, deletedAt: null },
        include: {
          user: { select: { name: true, email: true, phone: true } },
          memberships: {
            where: { status: "ACTIVE" },
            include: { plan: { select: { name: true } } },
            take: 1,
          },
        },
        orderBy: { joinDate: "desc" },
      });

      rows = members.map((m) => ({
        "Member ID": m.memberId,
        "Name": m.user.name,
        "Phone": m.user.phone || "",
        "Email": m.user.email,
        "Status": m.isActive ? "Active" : "Inactive",
        "Plan": m.memberships[0]?.plan?.name || "None",
        "Join Date": m.joinDate.toISOString().split("T")[0],
      }));
    } else if (resource === "payments") {
      const payments = await prisma.payment.findMany({
        where: { gymId: ctx.gym.id },
        include: {
          member: { include: { user: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 1000,
      });

      rows = payments.map((p) => ({
        "Payment ID": p.id,
        "Member": p.member.user.name,
        "Amount": p.totalAmount,
        "Status": p.status,
        "Method": p.method,
        "Date": p.createdAt.toISOString().split("T")[0],
      }));
    } else if (resource === "attendance") {
      const logs = await prisma.attendance.findMany({
        where: { gymId: ctx.gym.id },
        include: {
          member: { include: { user: { select: { name: true } } } },
        },
        orderBy: { checkIn: "desc" },
        take: 1000,
      });

      rows = logs.map((l) => ({
        "Member": l.member.user.name,
        "Date": l.date.toISOString().split("T")[0],
        "Check-In Time": l.checkIn.toLocaleTimeString(),
        "Method": l.method,
      }));
    } else if (resource === "trainers") {
      const trainers = await prisma.trainer.findMany({
        where: { gymId: ctx.gym.id, deletedAt: null },
        include: {
          user: { select: { name: true, email: true, phone: true } },
        },
      });

      rows = trainers.map((t) => ({
        "Trainer Name": t.user.name,
        "Email": t.user.email,
        "Phone": t.user.phone || "",
        "Specialization": t.specialization || "General Trainer",
        "Status": t.isActive ? "Active" : "Inactive",
      }));
    }

    await logAuditEvent({
      userId: ctx.user.id,
      gymId: ctx.gym.id,
      action: "DATA_EXPORT_GENERATED",
      resource: `export_${resource}`,
      metadata: { recordCount: rows.length },
    });

    return {
      ok: true,
      data: {
        filename: `${ctx.gym.slug}_${resource}_${dateStr}`,
        rows,
      },
    };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}


