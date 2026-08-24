"use server";

import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { slugify, generateGymCode } from "@/lib/utils";
import { getClientIp, checkRateLimit } from "@/lib/ratelimit";
import { isPasswordPwned } from "@/lib/pwned";
import { gymRegistrationSchema, type GymRegistrationInput } from "@/lib/validations";


export type RegisterResult =
  | { ok: true }
  | { ok: false; error: string };

export async function registerGymAction(
  input: GymRegistrationInput
): Promise<RegisterResult> {
  // Enforce IP-based rate limit: 3 registrations / 1 hour
  const ip = await getClientIp();
  const rl = await checkRateLimit(`signup:${ip}`, 3, 60 * 60);

  if (!rl.success) {
    const waitMins = Math.max(1, Math.ceil(rl.retryAfterSeconds / 60));
    return {
      ok: false,
      error: `Too many registration attempts from this IP. Please try again in ${waitMins} minutes.`,
    };
  }

  const parsed = gymRegistrationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }
  const data = parsed.data;

  // HaveIBeenPwned Compromised Password Check
  const { isPwned, breachCount } = await isPasswordPwned(data.password);
  if (isPwned) {
    return {
      ok: false,
      error: `This password has appeared in ${breachCount.toLocaleString()} known data breach${breachCount === 1 ? "" : "es"} (HaveIBeenPwned). For your security, please choose a unique password.`,
    };
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email } });

  if (existing) {
    return { ok: false, error: "An account with this email already exists. Try logging in." };
  }

  const gymCount = await prisma.gym.count();
  const gymCode = generateGymCode(gymCount + 1);
  const baseSlug = slugify(data.gymName);
  let slug = `${baseSlug}-${gymCode.toLowerCase()}`;
  for (let i = 2; i < 20; i++) {
    const taken = await prisma.gym.findUnique({ where: { slug } });
    if (!taken) break;
    slug = `${baseSlug}-${gymCode.toLowerCase()}-${i}`;
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: data.ownerName,
        email: data.email,
        phone: data.phone,
        password: passwordHash,
        role: "GYM_OWNER",
        status: "ACTIVE",
      },
    });

    const gym = await tx.gym.create({
      data: {
        gymCode,
        name: data.gymName,
        slug,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country ?? "India",
        gstNumber: data.gstNumber,
        status: "ACTIVE",
        onboarded: true,
        ownerId: user.id,
      },
    });

    // Isolated per-tenant settings + free subscription
    await tx.gymSettings.create({ data: { gymId: gym.id } });
    await tx.gymSubscription.create({
      data: {
        gymId: gym.id,
        plan: "FREE",
        status: "ACTIVE",
        price: 0,
        startDate: new Date(),
        endDate: new Date("2099-12-31"),
      },
    });
  });

  return { ok: true };
}
