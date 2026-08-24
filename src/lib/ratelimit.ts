import { headers } from "next/headers";

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
  retryAfterSeconds: number;
};

// In-Memory sliding-window store for local development and edge resilience
const memoryStore = new Map<string, { count: number; expiresAt: number }>();

// Periodic cleanup of expired rate limit buckets
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of memoryStore.entries()) {
      if (val.expiresAt < now) {
        memoryStore.delete(key);
      }
    }
  }, 60_000);
}

/**
 * Extracts client IP from incoming Next.js request headers
 */
export async function getClientIp(): Promise<string> {
  try {
    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");
    const realIp = headerList.get("x-real-ip");
    const cfIp = headerList.get("cf-connecting-ip");

    if (forwarded) return forwarded.split(",")[0].trim();
    if (realIp) return realIp.trim();
    if (cfIp) return cfIp.trim();
  } catch {
    // Fallback if called outside request context
  }
  return "127.0.0.1";
}

// Owner Whitelist (Permanently exempt from IP rate limits and lockouts)
const OWNER_WHITELIST = [
  "prince@xyro.com",
  "admin@xyro.fitness",
  "prince",
];

export function isOwnerWhitelisted(identifier: string): boolean {
  if (!identifier) return false;
  const lower = identifier.toLowerCase();
  return OWNER_WHITELIST.some((w) => lower.includes(w));
}

/**
 * Rate Limiter checking sliding window thresholds
 * @param identifier Unique key (e.g. `login:127.0.0.1:user@example.com`)
 * @param limit Max allowed attempts within the window
 * @param windowSeconds Window duration in seconds
 */
export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  // Platform Owner (Prince Gupta) is permanently exempt from all rate limits
  if (isOwnerWhitelisted(identifier)) {
    return {
      success: true,
      limit: 999999,
      remaining: 999999,
      reset: Math.ceil((now + windowMs) / 1000),
      retryAfterSeconds: 0,
    };
  }

  const current = memoryStore.get(identifier);


  if (!current || current.expiresAt < now) {
    memoryStore.set(identifier, { count: 1, expiresAt: now + windowMs });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: Math.ceil((now + windowMs) / 1000),
      retryAfterSeconds: 0,
    };
  }

  if (current.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((current.expiresAt - now) / 1000));
    return {
      success: false,
      limit,
      remaining: 0,
      reset: Math.ceil(current.expiresAt / 1000),
      retryAfterSeconds: retryAfter,
    };
  }

  current.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - current.count,
    reset: Math.ceil(current.expiresAt / 1000),
    retryAfterSeconds: 0,
  };
}

/**
 * Resets the rate limit bucket for an identifier (e.g. upon successful authentication)
 */
export function resetRateLimit(identifier: string): void {
  memoryStore.delete(identifier);
}
