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
        clientIp = clientIp || headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip") || null;
        clientUa = clientUa || headerList.get("user-agent") || null;
      } catch {
        // Headers may not be available in non-request contexts
      }
    }

    const payloadMetadata = {
      ...(event.metadata || {}),
      ...(event.before ? { _before: event.before } : {}),
      ...(event.after ? { _after: event.after } : {}),
    };

    await prisma.auditLog.create({
      data: {
        gymId: event.gymId || null,
        userId: event.userId,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId || null,
        metadata: Object.keys(payloadMetadata).length > 0 ? (payloadMetadata as never) : undefined,
        ipAddress: clientIp || null,
        userAgent: clientUa || null,
      },
    });
  } catch (error) {
    console.error("[AuditLog Error]:", error);
  }
}
