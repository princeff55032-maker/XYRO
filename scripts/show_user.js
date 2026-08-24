require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const user = await prisma.user.findUnique({ where: { email: 'apexace007@gmail.com' } });
  console.log(user);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
