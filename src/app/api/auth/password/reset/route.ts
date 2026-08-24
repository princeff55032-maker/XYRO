import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { getClientIp, checkRateLimit } from "@/lib/ratelimit";

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

  const user = await prisma.user.findFirst({ where: { resetToken: token } });
  if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
    return NextResponse.json({ ok: false, error: "Reset token is invalid or has expired" }, { status: 400 });
  }

  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ ok: false, error: "Password must be at least 8 characters long" }, { status: 400 });
  }

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
