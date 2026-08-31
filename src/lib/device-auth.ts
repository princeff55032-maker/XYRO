import crypto from "crypto";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import type { AccessDevice, Gym } from "@prisma/client";

export function hashDeviceApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

/**
 * Generates a cryptographically random device API key for turnstiles/scanners.
 * The full plaintext key is only returned once upon creation.
 */
export async function createDeviceApiKey(params: {
  gymId: string;
  name: string;
}): Promise<{ apiKey: string; keyPrefix: string; device: AccessDevice }> {
  const randomSecret = crypto.randomBytes(32).toString("hex");
  const apiKey = `xyro_dev_${randomSecret}`;
  const keyPrefix = apiKey.slice(0, 16);
  const apiKeyHash = hashDeviceApiKey(apiKey);

  const device = await prisma.accessDevice.create({
    data: {
      gymId: params.gymId,
      name: params.name,
      apiKeyHash,
      keyPrefix,
      isActive: true,
    },
  });

  return { apiKey, keyPrefix, device };
}

/**
 * Rotates an existing device API key with a fresh high-entropy key.
 * Invalidates the previous key immediately.
 */
export async function rotateDeviceApiKey(params: {
  deviceId: string;
  gymId: string;
}): Promise<{ apiKey: string; keyPrefix: string; device: AccessDevice }> {
  const randomSecret = crypto.randomBytes(32).toString("hex");
  const apiKey = `xyro_dev_${randomSecret}`;
  const keyPrefix = apiKey.slice(0, 16);
  const apiKeyHash = hashDeviceApiKey(apiKey);

  const device = await prisma.accessDevice.update({
    where: { id: params.deviceId, gymId: params.gymId },
    data: {
      apiKeyHash,
      keyPrefix,
      isActive: true,
      revokedAt: null,
    },
  });

  return { apiKey, keyPrefix, device };
}

export type DeviceAuthResult =
  | {
      ok: true;
      authType: "HARDWARE_DEVICE" | "STAFF_SESSION";
      gymId: string;
      gymCode: string;
      deviceName: string;
      deviceId?: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

/**
 * Authenticates the caller of access verification endpoints.
 * Supports:
 * 1. Physical Hardware Devices via `x-device-key` header (or `Authorization: Bearer xyro_dev_...`)
 * 2. Authenticated Front-Desk Staff Sessions (Owner, Admin, Receptionist)
 */
export async function authenticateAccessDevice(req: Request): Promise<DeviceAuthResult> {
  const deviceKeyHeader =
    req.headers.get("x-device-key") ||
    req.headers.get("x-api-key") ||
    (req.headers.get("authorization")?.startsWith("Bearer xyro_dev_")
      ? req.headers.get("authorization")!.replace("Bearer ", "")
      : null);

  // 1. Hardware Device Authentication
  if (deviceKeyHeader) {
    const cleanKey = deviceKeyHeader.trim();
    const apiKeyHash = hashDeviceApiKey(cleanKey);

    const device = await prisma.accessDevice.findUnique({
      where: { apiKeyHash },
      include: {
        gym: {
          select: { id: true, gymCode: true, status: true, deletedAt: true },
        },
      },
    });

    if (!device) {
      return {
        ok: false,
        status: 401,
        error: "Unauthorized: Invalid or unrecognized device API key.",
      };
    }

    if (!device.isActive || device.revokedAt) {
      return {
        ok: false,
        status: 403,
        error: "Forbidden: This access device has been revoked or deactivated by gym administration.",
      };
    }

    if (device.gym.status !== "ACTIVE" || device.gym.deletedAt) {
      return {
        ok: false,
        status: 403,
        error: "Forbidden: The associated gym facility is inactive or suspended.",
      };
    }

    // Fire-and-forget update of lastUsedAt timestamp
    prisma.accessDevice
      .update({
        where: { id: device.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((err) => console.error("Failed to update device lastUsedAt:", err));

    return {
      ok: true,
      authType: "HARDWARE_DEVICE",
      gymId: device.gym.id,
      gymCode: device.gym.gymCode,
      deviceName: device.name,
      deviceId: device.id,
    };
  }

  // 2. Staff Session Authentication (Front-Desk / Tablet Mode)
  try {
    const session = await auth();
    if (session?.user?.id && session.user.gymId) {
      const allowedRoles = ["SUPER_ADMIN", "GYM_OWNER", "GYM_ADMIN", "RECEPTIONIST"];
      if (allowedRoles.includes(session.user.role)) {
        return {
          ok: true,
          authType: "STAFF_SESSION",
          gymId: session.user.gymId,
          gymCode: session.user.gymCode || "WORKSPACE",
          deviceName: `Front-Desk (${session.user.name})`,
        };
      }
    }
  } catch {
    // Session lookup failed
  }

  return {
    ok: false,
    status: 401,
    error: "Unauthorized: Missing device credential. Provide a valid 'x-device-key' header or log in as gym staff.",
  };
}
