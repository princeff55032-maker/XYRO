require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

async function main() {
  const email = process.env.ADMIN_EMAIL || process.argv[2];
  const password = process.env.ADMIN_PASSWORD || process.argv[3];

  if (!email || !password) {
    console.error('Usage: node scripts/create_admin.js <email> <password> OR set ADMIN_EMAIL and ADMIN_PASSWORD in .env');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Error: Password must be at least 8 characters long.');
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const hashed = await bcrypt.hash(password, 10);
  const cleanEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (existing) {
    console.log('Admin user already exists. Updating role to SUPER_ADMIN...');
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: 'SUPER_ADMIN', status: 'ACTIVE', password: hashed },
    });
    console.log(`Updated user: ${cleanEmail}`);
    await prisma.$disconnect();
    return;
  }

  const user = await prisma.user.create({
    data: {
      email: cleanEmail,
      password: hashed,
      name: process.argv[4] || 'Admin User',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerified: new Date(),
    },
  });

  console.log('Created admin user:', user.email);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
