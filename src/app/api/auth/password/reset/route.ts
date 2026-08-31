import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { getClientIp, checkRateLimit } from "@/lib/ratelimit";
import { passwordSchema } from "@/lib/validations";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { token, password } = body;
  if (!token || !password) {
    return NextResponse.json({ ok: false, error: "Token and new password are required" }, { status: 400 });
  }

  // Rate limit: 5 attempts per 15 minutes per IP (prevents token brute-forcing)
  const ip = await getClientIp();
  const rl = await checkRateLimit(`pwd-reset:${ip}`, 5, 15 * 60);

  if (!rl.success) {
    const waitMinutes = Math.max(1, Math.ceil(rl.retryAfterSeconds / 60));
    return NextResponse.json(
      {
        ok: false,
        error: `Too many password reset attempts. Please request a new link and try again in ${waitMinutes} minute${waitMinutes === 1 ? "" : "s"}.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfterSeconds),
          "X-RateLimit-Limit": String(rl.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rl.reset),
        },
      }
    );
  }

  // 1. Compute SHA-256 hash of incoming token for database lookup
  const cleanToken = typeof token === "string" ? token.trim() : "";
  const hashedToken = crypto.createHash("sha256").update(cleanToken).digest("hex");

  const user = await prisma.user.findFirst({
    where: { resetToken: hashedToken },
  });

  if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
    return NextResponse.json({ ok: false, error: "Reset token is invalid or has expired" }, { status: 400 });
  }

  // 2. Enforce production password complexity policy
  const parsedPassword = passwordSchema.safeParse(password);
  if (!parsedPassword.success) {
    return NextResponse.json({ ok: false, error: parsedPassword.error.issues[0]?.message || "Password does not meet complexity requirements" }, { status: 400 });
  }

  // 3. Hash new password and invalidate reset token immediately (single-use lifecycle)
  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
      resetToken: null,
      resetTokenExpires: null,
      forcePasswordChange: false,
      loginAttempts: 0,
      lockedUntil: null,
    },
  });

  return NextResponse.json({ ok: true, message: "Password reset successful" });
}
