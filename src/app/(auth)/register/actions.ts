"use server";

import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { slugify, generateGymCode } from "@/lib/utils";
import { getClientIp, checkRateLimit } from "@/lib/ratelimit";
import { isPasswordPwned } from "@/lib/pwned";
import { gymRegistrationSchema, type GymRegistrationInput } from "@/lib/validations";


import { generateAndSendEmailOtp, verifyEmailOtp } from "@/lib/otp";

export type RegisterResult =
  | { ok: true; email: string }
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

  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });

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
        email: data.email.toLowerCase(),
        phone: data.phone,
        password: passwordHash,
        role: "GYM_OWNER",
        status: "PENDING_VERIFICATION",
      },
    });

    const gym = await tx.gym.create({
      data: {
        gymCode,
        name: data.gymName,
        slug,
        email: data.email.toLowerCase(),
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

  // Dispatch 6-digit verification code to email
  await generateAndSendEmailOtp({
    email: data.email,
    type: "SIGNUP",
    userName: data.ownerName,
  });

  return { ok: true, email: data.email.toLowerCase() };
}

export async function verifySignupOtpAction(input: {
  email: string;
  code: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const normalizedEmail = input.email.trim().toLowerCase();
    const verification = await verifyEmailOtp({
      email: normalizedEmail,
      code: input.code,
      type: "SIGNUP",
    });

    if (!verification.ok) {
      return { ok: false, error: verification.error };
    }

    // Activate user account
    await prisma.user.update({
      where: { email: normalizedEmail },
      data: {
        status: "ACTIVE",
        emailVerified: new Date(),
      },
    });

    return { ok: true };
  } catch (err) {
    console.error("[Verify Signup OTP Error]:", err);
    return { ok: false, error: "Failed to verify code. Please try again." };
  }
}

export async function resendSignupOtpAction(
  email: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const ip = await getClientIp();
    const normalizedEmail = email.trim().toLowerCase();
    const rl = await checkRateLimit(`resend-signup-otp:${ip}:${normalizedEmail}`, 3, 5 * 60);

    if (!rl.success) {
      const waitMins = Math.max(1, Math.ceil(rl.retryAfterSeconds / 60));
      return {
        ok: false,
        error: `Please wait ${waitMins} minute${waitMins === 1 ? "" : "s"} before requesting another code.`,
      };
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return { ok: false, error: "Account not found." };
    }

    if (user.status === "ACTIVE") {
      return { ok: false, error: "Account is already verified. Please log in." };
    }

    await generateAndSendEmailOtp({
      email: normalizedEmail,
      type: "SIGNUP",
      userName: user.name,
    });

    return { ok: true };
  } catch (err) {
    console.error("[Resend Signup OTP Error]:", err);
    return { ok: false, error: "Failed to resend code." };
  }
}
