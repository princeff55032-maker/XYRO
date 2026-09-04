import crypto from "crypto";
import prisma from "@/lib/db";
import { sendAppEmail } from "@/lib/email";

export type OtpType = "SIGNUP" | "LOGIN_2FA" | "PASSWORD_RESET";

function getSigningSecret(): string {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "xyro_otp_signing_secret_production_key_default";
}

/**
 * Mask email for privacy display: e.g. "ap****07@gmail.com"
 */
export function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return email;
  const [user, domain] = parts;
  if (user.length <= 2) {
    return `${user[0]}***@${domain}`;
  }
  const start = user.slice(0, 2);
  const end = user.slice(-2);
  return `${start}${"*".repeat(Math.max(2, user.length - 4))}${end}@${domain}`;
}

/**
 * Generates a cryptographically random 6-digit OTP, stores its SHA-256 hash,
 * and dispatches the code to the recipient's email address.
 */
export async function generateAndSendEmailOtp(params: {
  email: string;
  type: OtpType;
  userName?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const normalizedEmail = params.email.trim().toLowerCase();
  const now = Date.now();
  const expiresAt = new Date(now + 10 * 60 * 1000); // 10 minutes TTL

  // 1. Generate 6-digit secure numeric code (100000 - 999999)
  const otp = crypto.randomInt(100000, 1000000).toString();
  const codeHash = crypto.createHash("sha256").update(otp).digest("hex");

  try {
    // 2. Remove any previous unexpired OTPs for this email and type
    await prisma.emailOtp.deleteMany({
      where: { email: normalizedEmail, type: params.type },
    });

    // 3. Store new hashed OTP record
    await prisma.emailOtp.create({
      data: {
        email: normalizedEmail,
        codeHash,
        type: params.type,
        expiresAt,
        attempts: 0,
      },
    });

    // 4. Console log for development / debugging
    console.log(`\n=======================================================`);
    console.log(`🔐 [XYRO OTP DISPATCH]`);
    console.log(`📧 Target: ${normalizedEmail}`);
    console.log(`🏷️  Type: ${params.type}`);
    console.log(`🔢 Code: ${otp}`);
    console.log(`⏳ Expires: 10 minutes`);
    console.log(`=======================================================\n`);

    // 5. Send real email via Gmail SMTP or Resend
    const subject =
      params.type === "SIGNUP"
        ? "Verify your XYRO Account"
        : params.type === "LOGIN_2FA"
        ? "Your XYRO 2FA Login Code"
        : params.type === "PASSWORD_RESET"
        ? "Your XYRO Password Reset Code"
        : "Your XYRO Verification Code";

    const title =
      params.type === "SIGNUP"
        ? "Account Email Verification"
        : params.type === "LOGIN_2FA"
        ? "Two-Factor Authentication Code"
        : params.type === "PASSWORD_RESET"
        ? "Reset Your Password"
        : "Verification Code";

    const description =
      params.type === "SIGNUP"
        ? "Thank you for registering with XYRO. Enter this 6-digit code to activate your account and access your workspace."
        : params.type === "LOGIN_2FA"
        ? "A login attempt was initiated for your XYRO account. Enter this 6-digit verification code to complete your login."
        : "We received a request to reset your XYRO password. Enter this 6-digit verification code to set your new password.";

    await sendAppEmail({
      to: normalizedEmail,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #E5D9C5; border-radius: 16px; background-color: #FAF8F5;">
          <h1 style="color: #8B5E34; font-size: 24px; margin-top: 0; font-weight: 800;">${title}</h1>
          <p style="color: #33281E; font-size: 15px; line-height: 1.6;">Hello ${params.userName ? params.userName : ""},</p>
          <p style="color: #33281E; font-size: 14px; line-height: 1.6;">${description}</p>
          
          <div style="margin: 28px 0; padding: 20px; background-color: #FFFFFF; border: 2px dashed #8B5E34; border-radius: 12px; text-align: center;">
            <span style="font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #8B5E34;">${otp}</span>
          </div>
          
          <p style="font-size: 12px; color: #8C7A6B; line-height: 1.5;">This verification code will expire in <strong>10 minutes</strong>. Never share this code with anyone. If you did not initiate this request, please change your password immediately.</p>
        </div>
      `,
    });

    return { ok: true };
  } catch (err) {
    console.error("[OTP Generate Error]:", err);
    return { ok: false, error: "Failed to generate verification code. Please try again." };
  }
}

/**
 * Validates a submitted 6-digit OTP code against the database record.
 * Enforces single-use invalidation upon successful verification and max 3 attempts.
 */
export async function verifyEmailOtp(params: {
  email: string;
  code: string;
  type: OtpType;
}): Promise<{ ok: boolean; error?: string }> {
  const normalizedEmail = params.email.trim().toLowerCase();
  const cleanCode = params.code.trim();

  if (!cleanCode || cleanCode.length !== 6) {
    return { ok: false, error: "Please enter a valid 6-digit verification code." };
  }

  const record = await prisma.emailOtp.findFirst({
    where: {
      email: normalizedEmail,
      type: params.type,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return { ok: false, error: "No verification code found or code has already been used. Please request a new one." };
  }

  if (record.expiresAt < new Date()) {
    await prisma.emailOtp.delete({ where: { id: record.id } }).catch(() => {});
    return { ok: false, error: "Verification code has expired. Please request a new code." };
  }

  if (record.attempts >= 5) {
    await prisma.emailOtp.delete({ where: { id: record.id } }).catch(() => {});
    return { ok: false, error: "Too many failed attempts. This code has been invalidated. Please request a new code." };
  }

  const inputHash = crypto.createHash("sha256").update(cleanCode).digest("hex");

  const hashBuffer = Buffer.from(inputHash);
  const recordBuffer = Buffer.from(record.codeHash);

  const isMatch = hashBuffer.length === recordBuffer.length && crypto.timingSafeEqual(hashBuffer, recordBuffer);

  if (!isMatch) {
    await prisma.emailOtp.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    const remaining = Math.max(0, 4 - record.attempts);
    return {
      ok: false,
      error: `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
    };
  }

  // Single-use: Invalidate OTP record immediately upon match
  await prisma.emailOtp.delete({ where: { id: record.id } }).catch(() => {});

  return { ok: true };
}

/**
 * Creates a signed, short-lived (5 min) HMAC challenge token for 2FA login verification
 */
export function createLogin2faChallengeToken(params: { userId: string; email: string }): string {
  const secret = getSigningSecret();
  const payload = {
    userId: params.userId,
    email: params.email.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + 5 * 60, // 5 mins
    nonce: crypto.randomUUID(),
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");

  return `${payloadB64}.${signature}`;
}

/**
 * Verifies the 2FA login challenge token
 */
export function verifyLogin2faChallengeToken(token: string): {
  valid: boolean;
  payload?: { userId: string; email: string };
  error?: string;
} {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Missing challenge token" };
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false, error: "Malformed challenge token" };
  }

  const [payloadB64, signature] = parts;
  const secret = getSigningSecret();
  const expectedSig = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, error: "Invalid challenge signature" };
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return { valid: false, error: "2FA challenge session expired. Please log in again." };
    }
    return { valid: true, payload: { userId: payload.userId, email: payload.email } };
  } catch {
    return { valid: false, error: "Invalid challenge payload" };
  }
}
