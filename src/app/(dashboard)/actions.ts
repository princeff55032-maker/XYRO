"use server";

import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { requireWorkspaceAuth } from "@/lib/tenant";
import { generateMemberId } from "@/lib/utils";
import {
  addMemberSchema,
  membershipPlanSchema,
  paymentSchema,
  attendanceSchema,
  trainerSchema,
} from "@/lib/validations";

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

    const memberCount = await prisma.member.count({ where: { gymId: gym.id } });

    // Enforce member limit on FREE plan
    const subscription = await prisma.gymSubscription.findUnique({ where: { gymId: gym.id } });
    if (subscription?.plan === "FREE" && memberCount >= 50) {
      return {
        ok: false,
        error: "Free plan allows up to 50 members. Upgrade to Starter for more.",
      };
    }

    const memberId = generateMemberId(gym.gymCode, memberCount + 1);
    const rawPassword = `${data.phone.replace(/[^0-9]/g, "").slice(-4)}@xyro` || `${data.phone}@xyro`;
    const passwordHash = await bcrypt.hash(rawPassword, 10);

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

    const member = await prisma.member.findFirst({ where: { id, gymId: ctx.gym.id } });
    if (!member) return { ok: false, error: "Member not found" };

    await prisma.member.update({
      where: { id },
      data: { isActive: !member.isActive },
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

    await prisma.membershipPlan.create({
      data: { ...data, gymId: ctx.gym.id, sortOrder: 0 },
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

    const plan = await prisma.membershipPlan.findFirst({
      where: { id, gymId: ctx.gym.id },
    });
    if (!plan) return { ok: false, error: "Plan not found" };

    await prisma.membershipPlan.update({
      where: { id },
      data: { deletedAt: new Date() },
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
          const membership = await tx.membership.create({
            data: {
              gymId: gym.id,
              memberId: member.id,
              planId: plan.id,
              status: "ACTIVE",
              startDate: existing ? existing.endDate : now,
              endDate: new Date(
                (existing ? existing.endDate.getTime() : now.getTime()) +
                  plan.durationDays * 86400000
              ),
              daysRemaining: plan.durationDays,
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

    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function deletePaymentAction(input: {
  paymentId: string;
}): Promise<ActionResult> {
  try {
    const ctx = await requireWorkspaceAuth(
      ["GYM_OWNER", "GYM_ADMIN", "SUPER_ADMIN"],
      { requireEmailVerified: true }
    );

    const payment = await prisma.payment.findFirst({
      where: { id: input.paymentId, gymId: ctx.gym.id },
    });
    if (!payment) return { ok: false, error: "Payment record not found" };

    await prisma.payment.delete({
      where: { id: payment.id },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
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

    const parsed = trainerSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid trainer" };
    }
    const data = parsed.data;

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

    await prisma.trainer.create({
      data: {
        gymId: ctx.gym.id,
        userId: user.id,
        specialization: data.specialization,
        experience: data.experience,
        bio: data.bio,
      },
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

    const trainer = await prisma.trainer.findFirst({
      where: { id, gymId: ctx.gym.id },
    });
    if (!trainer) return { ok: false, error: "Trainer not found" };

    await prisma.trainer.update({
      where: { id },
      data: { isActive: !trainer.isActive },
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

    await prisma.workoutPlan.create({
      data: {
        gymId: ctx.gym.id,
        memberId: member.id,
        name: input.name,
        description: input.description || null,
        isActive: true,
        exercises: { create: exercises },
      },
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

    await prisma.dietPlan.create({
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

    await prisma.gymSettings.upsert({
      where: { gymId: ctx.gym.id },
      create: {
        gymId: ctx.gym.id,
        timezone: input.timezone || "Asia/Kolkata",
        currency: input.currency || "INR",
        currencySymbol: input.currencySymbol || "₹",
        dateFormat: input.dateFormat || "DD/MM/YYYY",
        openingTime: input.openingTime || "06:00",
        closingTime: input.closingTime || "22:00",
        workingDays: input.workingDays || ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
        enableQrCheckin: input.enableQrCheckin ?? true,
        enableWhatsapp: input.enableWhatsapp ?? false,
        enableEmail: input.enableEmail ?? true,
        enableSms: input.enableSms ?? false,
        expiryReminder30Days: input.expiryReminder30Days ?? true,
        expiryReminder15Days: input.expiryReminder15Days ?? true,
        expiryReminder7Days: input.expiryReminder7Days ?? true,
        expiryReminder3Days: input.expiryReminder3Days ?? true,
        expiryReminder1Day: input.expiryReminder1Day ?? true,
        autoSuspendOnExpiry: input.autoSuspendOnExpiry ?? false,
      },
      update: {
        ...(input.timezone !== undefined && { timezone: input.timezone }),
        ...(input.currency !== undefined && { currency: input.currency }),
        ...(input.currencySymbol !== undefined && { currencySymbol: input.currencySymbol }),
        ...(input.dateFormat !== undefined && { dateFormat: input.dateFormat }),
        ...(input.openingTime !== undefined && { openingTime: input.openingTime }),
        ...(input.closingTime !== undefined && { closingTime: input.closingTime }),
        ...(input.workingDays !== undefined && { workingDays: input.workingDays }),
        ...(input.enableQrCheckin !== undefined && { enableQrCheckin: input.enableQrCheckin }),
        ...(input.enableWhatsapp !== undefined && { enableWhatsapp: input.enableWhatsapp }),
        ...(input.enableEmail !== undefined && { enableEmail: input.enableEmail }),
        ...(input.enableSms !== undefined && { enableSms: input.enableSms }),
        ...(input.expiryReminder30Days !== undefined && { expiryReminder30Days: input.expiryReminder30Days }),
        ...(input.expiryReminder15Days !== undefined && { expiryReminder15Days: input.expiryReminder15Days }),
        ...(input.expiryReminder7Days !== undefined && { expiryReminder7Days: input.expiryReminder7Days }),
        ...(input.expiryReminder3Days !== undefined && { expiryReminder3Days: input.expiryReminder3Days }),
        ...(input.expiryReminder1Day !== undefined && { expiryReminder1Day: input.expiryReminder1Day }),
        ...(input.autoSuspendOnExpiry !== undefined && { autoSuspendOnExpiry: input.autoSuspendOnExpiry }),
      },
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

