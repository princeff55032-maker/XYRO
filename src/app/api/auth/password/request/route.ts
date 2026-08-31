import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/db";
import { getClientIp, checkRateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { email } = body;
  if (!email || typeof email !== "string") {
    return NextResponse.json({ ok: false, error: "Email required" }, { status: 400 });
  }

  // Rate limit: 3 password reset requests per 15 minutes per IP+email
  const ip = await getClientIp();
  const normalizedEmail = email.trim().toLowerCase();
  const rl = await checkRateLimit(`pwd-req:${ip}:${normalizedEmail}`, 3, 15 * 60);

  if (!rl.success) {
    const waitMinutes = Math.max(1, Math.ceil(rl.retryAfterSeconds / 60));
    return NextResponse.json(
      {
        ok: false,
        error: `Too many password reset requests. Please wait ${waitMinutes} minute${waitMinutes === 1 ? "" : "s"} before trying again.`,
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

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  // Constant-time generic response prevents account enumeration
  if (!user || user.deletedAt || user.status === "DEACTIVATED" || user.status === "SUSPENDED") {
    return NextResponse.json({
      ok: true,
      message: "If an account with that email exists, a password reset link has been dispatched.",
    });
  }

  // 1. Generate 32-byte cryptographically secure random token
  const rawToken = crypto.randomBytes(32).toString("hex");

  // 2. Compute SHA-256 hash for database storage (raw token is never stored in DB)
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

  // 3. 15-minute expiration window
  const expires = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: hashedToken, resetTokenExpires: expires },
  });

  const link = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/change-password?token=${rawToken}`;
  console.log(`[password] reset link for ${normalizedEmail}: ${link}`);

  return NextResponse.json({
    ok: true,
    message: "If an account with that email exists, a password reset link has been dispatched.",
  });
}
