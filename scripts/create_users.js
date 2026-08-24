require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

async function create(email, password, role) {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const hashed = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('exists', email);
    await prisma.$disconnect();
    return;
  }
  await prisma.user.create({ data: { email, password: hashed, name: email.split('@')[0], role, status: 'ACTIVE', forcePasswordChange: true } });
  console.log('created', email, role);
  await prisma.$disconnect();
}

async function main() {
  await create('trainer@xyro.test', 'Trainer123!', 'TRAINER');
  await create('reception@xyro.test', 'Reception123!', 'RECEPTIONIST');
  await create('member@xyro.test', 'Member123!', 'CUSTOMER');
}

main().catch((e) => { console.error(e); process.exit(1); });
