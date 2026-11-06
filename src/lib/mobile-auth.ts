import { jwtVerify, SignJWT } from "jose";
import { getAuthSecret } from "@/lib/env";

const ISSUER = "xyro-mobile";
const AUDIENCE = "xyro-member";

function secretKey() {
  return new TextEncoder().encode(getAuthSecret());
}

export async function createMobileAccessToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId, scope: "member" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifyMobileAccessToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    return payload.scope === "member" && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function getMobileUserId(request: Request): Promise<string | null> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return verifyMobileAccessToken(authorization.slice("Bearer ".length).trim());
}
