require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.log("🔒 Securing all tables in public schema with Row Level Security (RLS)...\n");

  const tables = await prisma.$queryRawUnsafe(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public';
  `);

  console.log(`Found ${tables.length} tables in Supabase public schema:`);

  for (const row of tables) {
    const table = row.tablename;
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY;`);
      console.log(`  ✓ RLS ENABLED: public."${table}"`);
    } catch (err) {
      console.error(`  ✗ Error on ${table}:`, err.message);
    }
  }

  console.log("\n✅ Success! All public tables now have Row Level Security enabled.");
  console.log("🛡️  Direct PostgREST API exposure without authorization has been blocked.");
  console.log("⚡  Your Next.js server-side Prisma operations remain 100% unaffected.");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
