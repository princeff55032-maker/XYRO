"use server";

import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { getClientIp, checkRateLimit } from "@/lib/ratelimit";
import {
  generateAndSendEmailOtp,
  verifyEmailOtp,
  createLogin2faChallengeToken,
  verifyLogin2faChallengeToken,
  maskEmail,
} from "@/lib/otp";

export type InitiateLoginResult =
  | {
      ok: true;
      requires2FA: true;
      loginChallengeToken: string;
      email: string;
      maskedEmail: string;
    }
  | {
      ok: false;
      error: string;
      unverifiedEmail?: string;
    };

export async function initiateLoginAction(input: {
  identifier: string;
  password?: string;
  portalRole?: string;
}): Promise<InitiateLoginResult> {
  try {
    const inputIdentifier = input.identifier.trim();
    if (!inputIdentifier || !input.password) {
      return { ok: false, error: "Login identifier and password are required" };
    }

    const portalRole = input.portalRole?.toUpperCase();
    const ip = await getClientIp();
    const rateLimitKey = `login:${ip}:${inputIdentifier.toLowerCase()}`;

    // 1. Sliding-window rate limit (5 attempts / 15 mins)
    const rl = await checkRateLimit(rateLimitKey, 5, 15 * 60);
    if (!rl.success) {
      const waitMins = Math.max(1, Math.ceil(rl.retryAfterSeconds / 60));
      return { ok: false, error: `Too many login attempts. Locked out for ${waitMins} minutes.` };
    }

    // 2. Lookup user by email, memberId, or phone
    let user = null;
    if (inputIdentifier.includes("@")) {
      user = await prisma.user.findUnique({
        where: { email: inputIdentifier.toLowerCase() },
      });
    } else {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { member: { memberId: { equals: inputIdentifier, mode: "insensitive" } } },
            { phone: inputIdentifier },
            { email: inputIdentifier.toLowerCase() },
          ],
        },
      });
    }

    if (!user || !user.password) {
      return { ok: false, error: "Invalid login credentials" };
    }

    if (user.status === "SUSPENDED") {
      return { ok: false, error: "Your account has been suspended" };
    }

    if (user.status === "DEACTIVATED") {
      return { ok: false, error: "Your account has been deactivated" };
    }

    if (user.status === "PENDING_VERIFICATION") {
      return {
        ok: false,
        error: "Please verify your email address to activate your account.",
        unverifiedEmail: user.email,
      };
    }

    // Enforce Portal Role Boundary
    if (portalRole === "GYM") {
      if (user.role === "CUSTOMER") {
        return { ok: false, error: "This is a Gym Member account. Please select the 'Gym Member' tab above to log in." };
      }
      if (user.role === "TRAINER") {
        return { ok: false, error: "This is a Trainer account. Please select the 'Trainer' tab above to log in." };
      }
    } else if (portalRole === "TRAINER") {
      if (user.role !== "TRAINER" && user.role !== "SUPER_ADMIN") {
        return { ok: false, error: "This is not a Trainer account. Please select the appropriate portal tab above." };
      }
    } else if (portalRole === "MEMBER") {
      if (user.role !== "CUSTOMER" && user.role !== "SUPER_ADMIN") {
        return { ok: false, error: "This is a staff or admin account. Please select the 'Gym Admin' tab above to log in." };
      }
    }

    // 3. Check Lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.max(1, Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000)));
      return { ok: false, error: `Account temporarily locked due to failed attempts. Please try again in ${remainingMinutes} minutes.` };
    }

    // 4. Verify password
    const isValid = await bcrypt.compare(input.password, user.password);
    if (!isValid) {
      const nextAttempts = (user.loginAttempts || 0) + 1;
      const isLocked = nextAttempts >= 5;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: nextAttempts,
          ...(isLocked ? { lockedUntil: new Date(Date.now() + 15 * 60 * 1000) } : {}),
        },
      });

      if (isLocked) {
        return { ok: false, error: "5 failed attempts. Account temporarily locked for 15 minutes." };
      }

      const attemptsRemaining = Math.max(0, 5 - nextAttempts);
      return { ok: false, error: `Invalid login credentials. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} remaining.` };
    }

    // 5. Generate & Send 2FA OTP to User's Registered Email
    await generateAndSendEmailOtp({
      email: user.email,
      type: "LOGIN_2FA",
      userName: user.name,
    });

    // 6. Create 5-minute cryptographic challenge token
    const loginChallengeToken = createLogin2faChallengeToken({
      userId: user.id,
      email: user.email,
    });

    return {
      ok: true,
      requires2FA: true,
      loginChallengeToken,
      email: user.email,
      maskedEmail: maskEmail(user.email),
    };
  } catch (err) {
    console.error("[Initiate Login Error]:", err);
    return { ok: false, error: "Failed to initiate login. Please try again." };
  }
}

export async function resendLogin2faOtpAction(input: {
  loginChallengeToken: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const verification = verifyLogin2faChallengeToken(input.loginChallengeToken);
    if (!verification.valid || !verification.payload) {
      return { ok: false, error: verification.error || "Invalid or expired session. Please log in again." };
    }

    const email = verification.payload.email;
    const ip = await getClientIp();
    const rl = await checkRateLimit(`resend-login-otp:${ip}:${email}`, 3, 5 * 60);

    if (!rl.success) {
      const waitMins = Math.max(1, Math.ceil(rl.retryAfterSeconds / 60));
      return { ok: false, error: `Please wait ${waitMins} minute${waitMins === 1 ? "" : "s"} before requesting another code.` };
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { ok: false, error: "User not found." };
    }

    await generateAndSendEmailOtp({
      email,
      type: "LOGIN_2FA",
      userName: user.name,
    });

    return { ok: true };
  } catch (err) {
    console.error("[Resend Login 2FA OTP Error]:", err);
    return { ok: false, error: "Failed to resend 2FA code." };
  }
}
