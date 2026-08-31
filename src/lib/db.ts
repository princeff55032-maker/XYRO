import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getCleanDatabaseUrl(): string {
  let url = process.env.DATABASE_URL || "";
  if (url.includes(".pooler.supabase.com")) {
    url = url
      .replace(":6543", ":5432")
      .replace("?pgbouncer=true&", "?")
      .replace("?pgbouncer=true", "")
      .replace("&pgbouncer=true", "");
  }
  return url;
}

function createPrismaClient() {
  const connectionString = getCleanDatabaseUrl();
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
