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

  // Dispatch real email if Resend API key is configured in environment
  const resendApiKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
  if (resendApiKey) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "XYRO Security <onboarding@resend.dev>",
          to: [normalizedEmail],
          subject: "Reset your XYRO password",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E5D9C5; border-radius: 16px; background-color: #FAF8F5;">
              <h2 style="color: #8B5E34; margin-top: 0;">Reset Your XYRO Password</h2>
              <p style="color: #33281E; font-size: 14px; line-height: 1.6;">Hello,</p>
              <p style="color: #33281E; font-size: 14px; line-height: 1.6;">We received a request to reset your password for your XYRO account. Click the button below to set a new password:</p>
              <div style="margin: 28px 0; text-align: center;">
                <a href="${link}" style="background-color: #8B5E34; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 14px; display: inline-block;">Reset Password</a>
              </div>
              <p style="font-size: 12px; color: #8C7A6B; line-height: 1.5;">This link will expire in 15 minutes and can only be used once. If you did not request a password reset, you can safely ignore this email.</p>
            </div>
          `,
        }),
      });
    } catch (sendErr) {
      console.error("[password] failed to send email via Resend:", sendErr);
    }
  }

  return NextResponse.json({
    ok: true,
    message: "If an account with that email exists, a password reset link has been dispatched.",
  });
}
