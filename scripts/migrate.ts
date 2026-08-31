import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });

async function run() {
  console.log("Connected. Running DDL migrations...");
  
  // 1. Add timeSlot column to members table if not exists
  await pool.query(`ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "timeSlot" TEXT;`);
  console.log("✓ Added timeSlot column to members table");

  // 2. Ensure progress_records table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "progress_records" (
      "id" TEXT NOT NULL,
      "memberId" TEXT NOT NULL,
      "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "weight" DOUBLE PRECISION,
      "height" DOUBLE PRECISION,
      "bodyFat" DOUBLE PRECISION,
      "chest" DOUBLE PRECISION,
      "waist" DOUBLE PRECISION,
      "arms" DOUBLE PRECISION,
      "thighs" DOUBLE PRECISION,
      "bmi" DOUBLE PRECISION,
      "calories" INTEGER,
      "waterLiters" DOUBLE PRECISION,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "progress_records_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "progress_records_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  console.log("✓ Checked/Created progress_records table");

  // 4. Ensure access_devices table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "access_devices" (
      "id" TEXT NOT NULL,
      "gymId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "apiKeyHash" TEXT NOT NULL,
      "keyPrefix" TEXT NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "lastUsedAt" TIMESTAMP(3),
      "revokedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "access_devices_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "access_devices_apiKeyHash_key" UNIQUE ("apiKeyHash"),
      CONSTRAINT "access_devices_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  console.log("✓ Checked/Created access_devices table");

  // 5. Ensure rate_limit_records table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "rate_limit_records" (
      "id" TEXT NOT NULL,
      "key" TEXT NOT NULL,
      "count" INTEGER NOT NULL DEFAULT 1,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "rate_limit_records_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "rate_limit_records_key_key" UNIQUE ("key")
    );
  `);
  console.log("✓ Checked/Created rate_limit_records table");

  // 6. Create indexes
  await pool.query(`CREATE INDEX IF NOT EXISTS "access_devices_gymId_idx" ON "access_devices"("gymId");`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "access_devices_apiKeyHash_idx" ON "access_devices"("apiKeyHash");`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "rate_limit_records_key_idx" ON "rate_limit_records"("key");`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "rate_limit_records_expiresAt_idx" ON "rate_limit_records"("expiresAt");`);

  await pool.end();
  console.log("Migration complete!");
}

run().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
