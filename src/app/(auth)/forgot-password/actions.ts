"use server";

import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { getClientIp, checkRateLimit } from "@/lib/ratelimit";
import { isPasswordPwned } from "@/lib/pwned";
import { strongPasswordSchema } from "@/lib/validations";
import { generateAndSendEmailOtp, verifyEmailOtp, maskEmail } from "@/lib/otp";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");

export async function requestPasswordResetOtpAction(
  email: string
): Promise<{ ok: boolean; error?: string; maskedEmail?: string }> {
  try {
    const parsed = emailSchema.safeParse(email?.trim());
    if (!parsed.success) {
      return { ok: false, error: "Please enter a valid email address." };
    }

    const normalizedEmail = parsed.data.toLowerCase();
    const ip = await getClientIp();

    // Rate limit: 4 requests per 15 minutes per IP & email
    const rl = await checkRateLimit(`pwd-reset-req:${ip}:${normalizedEmail}`, 4, 15 * 60);
    if (!rl.success) {
      const waitMins = Math.max(1, Math.ceil(rl.retryAfterSeconds / 60));
      return {
        ok: false,
        error: `Too many password reset requests. Please wait ${waitMins} minute${waitMins === 1 ? "" : "s"} before trying again.`,
      };
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, status: true, deletedAt: true },
    });

    // For safety and privacy, if user is not found or suspended, return ok with masked email without exposing user existence
    if (!user || user.deletedAt || user.status === "DEACTIVATED" || user.status === "SUSPENDED") {
      return { ok: true, maskedEmail: maskEmail(normalizedEmail) };
    }

    // Generate 6-digit OTP and send via configured email transporter (Gmail SMTP)
    const result = await generateAndSendEmailOtp({
      email: normalizedEmail,
      type: "PASSWORD_RESET",
      userName: user.name,
    });

    if (!result.ok) {
      return { ok: false, error: result.error || "Failed to send verification code. Please try again." };
    }

    return { ok: true, maskedEmail: maskEmail(normalizedEmail) };
  } catch (err) {
    console.error("[Request Password Reset OTP Error]:", err);
    return { ok: false, error: "An unexpected error occurred. Please try again." };
  }
}

export async function resendPasswordResetOtpAction(
  email: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const parsed = emailSchema.safeParse(email?.trim());
    if (!parsed.success) {
      return { ok: false, error: "Please enter a valid email address." };
    }

    const normalizedEmail = parsed.data.toLowerCase();
    const ip = await getClientIp();

    // Rate limit: 3 resend attempts per 5 minutes
    const rl = await checkRateLimit(`resend-pwd-otp:${ip}:${normalizedEmail}`, 3, 5 * 60);
    if (!rl.success) {
      const waitMins = Math.max(1, Math.ceil(rl.retryAfterSeconds / 60));
      return {
        ok: false,
        error: `Please wait ${waitMins} minute${waitMins === 1 ? "" : "s"} before requesting another code.`,
      };
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, status: true, deletedAt: true },
    });

    if (user && !user.deletedAt && user.status !== "DEACTIVATED" && user.status !== "SUSPENDED") {
      await generateAndSendEmailOtp({
        email: normalizedEmail,
        type: "PASSWORD_RESET",
        userName: user.name,
      });
    }

    return { ok: true };
  } catch (err) {
    console.error("[Resend Password Reset OTP Error]:", err);
    return { ok: false, error: "Failed to resend code. Please try again." };
  }
}

export async function resetPasswordWithOtpAction(input: {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { email, code, password, confirmPassword } = input;

    if (!email || !email.trim()) {
      return { ok: false, error: "Email address is required." };
    }

    const cleanCode = code?.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      return { ok: false, error: "Please enter all 6 digits of the verification code." };
    }

    if (!password) {
      return { ok: false, error: "Please enter a new password." };
    }

    if (password !== confirmPassword) {
      return { ok: false, error: "Passwords do not match." };
    }

    // Validate password complexity
    const passwordValidation = strongPasswordSchema.safeParse(password);
    if (!passwordValidation.success) {
      return {
        ok: false,
        error:
          passwordValidation.error.issues[0]?.message ||
          "Password must be at least 12 characters and contain uppercase, lowercase, number, and special character.",
      };
    }

    // HaveIBeenPwned Compromised Password Check
    const { isPwned, breachCount } = await isPasswordPwned(password);
    if (isPwned) {
      return {
        ok: false,
        error: `This password has appeared in ${breachCount.toLocaleString()} known data breach${breachCount === 1 ? "" : "es"}. For your security, please choose a unique password.`,
      };
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Verify submitted 6-digit OTP
    const verification = await verifyEmailOtp({
      email: normalizedEmail,
      code: cleanCode,
      type: "PASSWORD_RESET",
    });

    if (!verification.ok) {
      return { ok: false, error: verification.error };
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return { ok: false, error: "User account not found." };
    }

    // Hash new password & reset security flags
    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: passwordHash,
        forcePasswordChange: false,
        loginAttempts: 0,
        lockedUntil: null,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    return { ok: true };
  } catch (err) {
    console.error("[Reset Password With OTP Error]:", err);
    return { ok: false, error: "Failed to reset password. Please try again." };
  }
}
