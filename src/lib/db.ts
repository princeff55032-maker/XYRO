import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  const pool =
    globalForPrisma.pool ??
    new Pool({
      connectionString,
      max: process.env.NODE_ENV === "production" ? 4 : 10,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    });

  if (process.env.NODE_ENV !== "production") globalForPrisma.pool = pool;

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
