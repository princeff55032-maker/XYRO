import crypto from "crypto";

export interface QrTokenPayload {
  sub: string;        // member ID (e.g. database ID)
  gymId: string;      // gym UUID
  memberCode: string; // human readable member code (e.g. GYM_001-M-000001)
  gymCode: string;    // gym code (e.g. GYM_001)
  iat: number;        // issued at timestamp (seconds)
  exp: number;        // expiration timestamp (seconds)
  jti: string;        // unique nonce / token ID
}

function getSigningSecret(): string {
  const secret = process.env.QR_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: QR_SECRET or AUTH_SECRET must be configured in environment.");
    }
    return "xyro_development_qr_signing_secret_do_not_use_in_prod";
  }
  return secret;
}

/**
 * Base64URL encoding (RFC 4648)
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

/**
 * Generates a cryptographically signed HMAC-SHA256 dynamic QR token
 * Valid for 60 seconds.
 */
export function generateMemberQrToken(params: {
  memberId: string;
  gymId: string;
  memberCode: string;
  gymCode: string;
  ttlSeconds?: number;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const ttl = params.ttlSeconds ?? 60; // 60 seconds default TTL

  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const payload: QrTokenPayload = {
    sub: params.memberId,
    gymId: params.gymId,
    memberCode: params.memberCode,
    gymCode: params.gymCode,
    iat: now,
    exp: now + ttl,
    jti: crypto.randomUUID(),
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const message = `${encodedHeader}.${encodedPayload}`;

  const secret = getSigningSecret();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${message}.${signature}`;
}

export type QrVerificationResult =
  | { valid: true; payload: QrTokenPayload }
  | { valid: false; error: string; code: "INVALID_SIGNATURE" | "EXPIRED" | "MALFORMED" | "FUTURE_TOKEN" };

/**
 * Cryptographically verifies an incoming dynamic QR token
 */
export function verifyMemberQrToken(token: string): QrVerificationResult {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Empty or invalid QR token format", code: "MALFORMED" };
  }

  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    return { valid: false, error: "Invalid token structure (expected 3 parts)", code: "MALFORMED" };
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const message = `${encodedHeader}.${encodedPayload}`;
  const secret = getSigningSecret();

  // 1. Verify HMAC-SHA256 Signature using timing-safe comparison
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { valid: false, error: "Cryptographic signature validation failed. Token is forged or corrupted.", code: "INVALID_SIGNATURE" };
  }

  // 2. Parse and validate claims
  let payload: QrTokenPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    return { valid: false, error: "Malformed token payload JSON", code: "MALFORMED" };
  }

  if (!payload.sub || !payload.gymId || !payload.exp || !payload.iat || !payload.jti) {
    return { valid: false, error: "Missing required token claims", code: "MALFORMED" };
  }

  const now = Math.floor(Date.now() / 1000);

  // 3. Expiration Check (with 5s clock-drift tolerance)
  if (now > payload.exp + 5) {
    return { valid: false, error: "QR token has expired. Please refresh your dynamic pass.", code: "EXPIRED" };
  }

  // 4. Future token sanity check
  if (payload.iat > now + 30) {
    return { valid: false, error: "Token issued in the future. Clock synchronization error.", code: "FUTURE_TOKEN" };
  }

  return { valid: true, payload };
}
