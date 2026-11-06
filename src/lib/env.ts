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

  const cleanUrl = configuredUrl.replace(/^(['"])(.*)\1$/, "$2");
  if (!cleanUrl.includes(".pooler.supabase.com")) {
    return cleanUrl;
  }

  const url = new URL(cleanUrl);
  if (url.port === "6543") {
    url.port = "5432";
  }
  url.searchParams.delete("pgbouncer");
  return url.toString();
}
