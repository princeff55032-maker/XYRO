require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const email = process.argv[2] || 'admin@xyro.fitness';
  const password = process.argv[3] || 'Admin123!';
  const name = process.argv[4] || 'Prince Gupta';

  console.log(`Creating / Updating Website Master Owner account for: ${email}`);

  const hashedPassword = await bcrypt.hash(password, 10);

  // 1. Upsert User
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      },
    });
    console.log(`✓ User account created: ${email}`);
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      },
    });
    console.log(`✓ User account updated: ${email}`);
  }

  // 2. Ensure linked to default master Gym workspace so they have full gym access too
  let gym = await prisma.gym.findFirst();
  if (gym) {
    await prisma.gym.update({
      where: { id: gym.id },
      data: { ownerId: user.id },
    });
    console.log(`✓ Master Gym workspace linked: ${gym.name} (${gym.gymCode})`);
  }

  console.log('\n=============================================');
  console.log('🎉 WEBSITE OWNER / PLATFORM ADMIN READY:');
  console.log(`📧 Email:    ${email}`);
  console.log(`🔑 Password: ${password}`);
  console.log('🛡️ Role:     SUPER_ADMIN (Full Website & Gym Owner Privileges)');
  console.log('=============================================\n');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Error creating website owner:', e);
  process.exit(1);
});
