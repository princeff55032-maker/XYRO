import { headers } from "next/headers";
import prisma from "@/lib/db";

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
  retryAfterSeconds: number;
};

// In-Memory fallback store for resilience when DB is temporarily unreachable
const inMemoryStore = new Map<string, { count: number; expiresAt: number }>();

// Periodic in-memory cleanup
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of inMemoryStore.entries()) {
      if (val.expiresAt < now) {
        inMemoryStore.delete(key);
      }
    }
  }, 60_000);
}

/**
 * Extracts client IP securely from incoming trusted headers.
 * Protects against IP spoofing by prioritizing platform-injected proxy headers.
 */
export async function getClientIp(): Promise<string> {
  try {
    const headerList = await headers();
    // 1. Trusted Vercel Edge / Cloudflare / Nginx proxy headers
    const vercelIp = headerList.get("x-vercel-proxied-for");
    const cfIp = headerList.get("cf-connecting-ip");
    const realIp = headerList.get("x-real-ip");
    const forwarded = headerList.get("x-forwarded-for");

    if (vercelIp) return vercelIp.split(",")[0].trim();
    if (cfIp) return cfIp.trim();
    if (realIp) return realIp.trim();
    if (forwarded) {
      // Use the client IP (first entry in standard forward chain)
      return forwarded.split(",")[0].trim();
    }
  } catch {
    // Fallback if invoked outside active request context
  }
  return "127.0.0.1";
}

/**
 * Distributed, Persistent Rate Limiter (Horizontally Scalable on Vercel)
 * Uses database-backed rate limit records with resilient sliding-window fallback.
 * Uniform security: Applies to all users and administrators without exception.
 *
 * @param identifier Unique rate limit key (e.g. `login:192.168.1.1:admin@xyro.fitness`)
 * @param limit Max allowed requests within window
 * @param windowSeconds Window duration in seconds
 */
export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const expiresAt = new Date(now + windowMs);

  try {
    // 1. Database-backed single-statement atomic rate limiting (Race-Condition Free)
    const result: Array<{ count: number; expiresAt: Date }> = await prisma.$queryRaw`
      INSERT INTO "rate_limit_records" ("key", "count", "expiresAt")
      VALUES (${identifier}, 1, ${expiresAt})
      ON CONFLICT ("key") DO UPDATE
      SET 
        "count" = CASE 
          WHEN "rate_limit_records"."expiresAt" < NOW() THEN 1 
          ELSE "rate_limit_records"."count" + 1 
        END,
        "expiresAt" = CASE 
          WHEN "rate_limit_records"."expiresAt" < NOW() THEN ${expiresAt} 
          ELSE "rate_limit_records"."expiresAt" 
        END
      RETURNING "count", "expiresAt";
    `;

    if (result && result.length > 0) {
      const currentRecord = result[0];
      const count = currentRecord.count;
      const recordExpiresAt = new Date(currentRecord.expiresAt).getTime();

      if (count > limit) {
        const retryAfter = Math.max(1, Math.ceil((recordExpiresAt - now) / 1000));
        return {
          success: false,
          limit,
          remaining: 0,
          reset: Math.ceil(recordExpiresAt / 1000),
          retryAfterSeconds: retryAfter,
        };
      }

      return {
        success: true,
        limit,
        remaining: Math.max(0, limit - count),
        reset: Math.ceil(recordExpiresAt / 1000),
        retryAfterSeconds: 0,
      };
    }
  } catch (err) {
    console.warn("[RateLimit DB Error - Fallback to in-memory]:", err);
  }
    // 2. In-Memory fallback if database connection is busy/offline
    const current = inMemoryStore.get(identifier);

    if (!current || current.expiresAt < now) {
      inMemoryStore.set(identifier, { count: 1, expiresAt: now + windowMs });
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
 * Resets rate limit for a specific identifier (e.g. after successful authentication)
 */
export async function resetRateLimit(identifier: string): Promise<void> {
  inMemoryStore.delete(identifier);
  try {
    await prisma.rateLimitRecord.delete({
      where: { key: identifier },
    });
  } catch {
    // Ignore if not found in DB
  }
}
