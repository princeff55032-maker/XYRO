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

  // 3. Create index if not exists
  await pool.query(`CREATE INDEX IF NOT EXISTS "progress_records_memberId_date_idx" ON "progress_records"("memberId", "date");`);
  console.log("✓ Created progress_records index");

  const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'members';`);
  console.log("Members columns:", res.rows.map((r: any) => r.column_name));

  await pool.end();
  console.log("Migration complete!");
}

run().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
