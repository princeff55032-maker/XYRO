require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.log('\n======================================================');
  console.log('  WIPING ALL DATABASE RECORDS (CLEAN RESET)');
  console.log('======================================================\n');

  // Delete all records from dependent tables first
  console.log('1. Clearing records from all platform tables...');
  
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.supportTicket.deleteMany({});
  await prisma.announcement.deleteMany({});
  await prisma.whatsAppLog.deleteMany({});
  await prisma.whatsAppSettings.deleteMany({});
  await prisma.notificationTemplate.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.equipment.deleteMany({});
  await prisma.classBooking.deleteMany({});
  await prisma.gymClass.deleteMany({});
  await prisma.dietMeal.deleteMany({});
  await prisma.dietPlan.deleteMany({});
  await prisma.workoutExercise.deleteMany({});
  await prisma.workoutPlan.deleteMany({});
  await prisma.progressRecord.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.membership.deleteMany({});
  await prisma.membershipPlan.deleteMany({});
  await prisma.member.deleteMany({});
  await prisma.trainer.deleteMany({});
  await prisma.gymStaff.deleteMany({});
  await prisma.gymSubscription.deleteMany({});
  await prisma.gymSettings.deleteMany({});
  await prisma.gym.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('  ✓ All previous users, gyms, members, trainers, and logs erased.');

  // 2. Create only ONE Super Admin account
  console.log('\n2. Creating single Super Admin account...');
  const adminEmail = 'prince@xyro.com';
  const adminPassword = 'XyroAdmin#2026!';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const superAdmin = await prisma.user.create({
    data: {
      email: adminEmail,
      name: 'Prince Gupta',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerified: new Date(),
      forcePasswordChange: false,
    },
  });

  // Verify counts
  const userCount = await prisma.user.count();
  const gymCount = await prisma.gym.count();
  const memberCount = await prisma.member.count();
  const trainerCount = await prisma.trainer.count();

  console.log('\n======================================================');
  console.log('  CLEAN RESET COMPLETED SUCCESSFULLY');
  console.log('======================================================');
  console.log(`  Total Users in DB:    ${userCount}`);
  console.log(`  Total Gyms in DB:     ${gymCount}`);
  console.log(`  Total Members in DB:  ${memberCount}`);
  console.log(`  Total Trainers in DB: ${trainerCount}`);
  console.log('------------------------------------------------------');
  console.log('  SUPER ADMIN CREDENTIALS:');
  console.log(`  Email:    ${superAdmin.email}`);
  console.log(`  Password: ${adminPassword}`);
  console.log(`  Role:     ${superAdmin.role}`);
  console.log(`  URL:      http://localhost:3000/login`);
  console.log('======================================================\n');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Error during clean database reset:', e);
  process.exit(1);
});
