import prisma from "@/lib/db";
import { headers } from "next/headers";

export type AuditEvent = {
  gymId?: string | null;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "secret",
  "token",
  "resettoken",
  "apikey",
  "apikeyhash",
  "refreshtoken",
  "accesstoken",
  "clientsecret",
]);

function sanitizeMetadata(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeMetadata);

  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const lowerKey = k.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes("password") || lowerKey.includes("secret")) {
      clean[k] = "[REDACTED]";
    } else if (v && typeof v === "object") {
      clean[k] = sanitizeMetadata(v);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

/**
 * Log an immutable audit event with optional Before/After state diffs.
 */
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    let clientIp = event.ipAddress;
    let clientUa = event.userAgent;

    if (!clientIp || !clientUa) {
      try {
        const headerList = await headers();
        clientIp =
          clientIp ||
          headerList.get("x-vercel-proxied-for")?.split(",")[0]?.trim() ||
          headerList.get("cf-connecting-ip") ||
          headerList.get("x-real-ip") ||
          headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          null;
        clientUa = clientUa || headerList.get("user-agent") || null;
      } catch {
        // Headers may not be available in non-request contexts
      }
    }

    const rawPayload = {
      ...(event.metadata || {}),
      ...(event.before ? { _before: event.before } : {}),
      ...(event.after ? { _after: event.after } : {}),
    };

    const sanitized = sanitizeMetadata(rawPayload);

    await prisma.auditLog.create({
      data: {
        gymId: event.gymId || null,
        userId: event.userId,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId || null,
        metadata: Object.keys(sanitized).length > 0 ? (sanitized as never) : undefined,
        ipAddress: clientIp || null,
        userAgent: clientUa || null,
      },
    });
  } catch (error) {
    console.error("[AuditLog Error]:", error);
  }
}
