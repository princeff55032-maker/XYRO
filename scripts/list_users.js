require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  // Update password for prince@xyro.com to admin123
  const h = await bcrypt.hash('admin123', 10);
  await prisma.user.updateMany({
    where: { email: 'prince@xyro.com' },
    data: { password: h },
  });

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, status: true },
  });
  console.log('Current users in Supabase database:');
  console.table(users);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
