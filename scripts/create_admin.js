require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const email = process.argv[2] || process.env.ADMIN_EMAIL || 'admin@xyro.test';
  const password = process.argv[3] || process.env.ADMIN_PASSWORD || 'Password123!';

  const hashed = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Admin user already exists:', email);
    await prisma.$disconnect();
    return;
  }

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      name: 'Admin User',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerified: new Date(),
    },
  });

  console.log('Created admin user:', email, 'password:', password);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
