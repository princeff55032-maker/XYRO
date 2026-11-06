import "server-only";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    if (process.env.NEXT_PHASE === "phase-production-build") {
      return `build-only-${name.toLowerCase()}-placeholder`;
    }
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getAuthSecret(): string {
  return required("AUTH_SECRET");
}

export function getDatabaseUrl(): string {
  const configuredUrl = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!configuredUrl) {
    return required("DATABASE_URL");
  }

  return configuredUrl.replace(/^(['"])(.*)\1$/, "$2");
}
