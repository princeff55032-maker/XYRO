import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
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
  if (!user) return NextResponse.json({ ok: true }); // don't reveal existence

  const token = uuidv4();
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpires: expires },
  });

  // In dev we log the link; in production you'd send email.
  const link = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/change-password?token=${token}`;
  console.log(`[password] reset link for ${normalizedEmail}: ${link}`);

  return NextResponse.json({ ok: true });
}
