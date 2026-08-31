require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

async function main() {
  // Production Safeguard
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.DATABASE_URL?.includes('supabase.com') ||
    process.env.DATABASE_URL?.includes('pooler.supabase.com');

  if (isProduction && !process.argv.includes('--force-production-confirm-destructive-wipe')) {
    console.error('======================================================');
    console.error('⛔ FATAL SAFEGUARD TRIGGERED: PRODUCTION DATABASE DETECTED');
    console.error('======================================================');
    console.error('You are targeting a production database. To prevent accidental data loss,');
    console.error('you must explicitly pass: --force-production-confirm-destructive-wipe');
    process.exit(1);
  }

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
  await prisma.accessDevice.deleteMany({});
  await prisma.lead.deleteMany({});
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

  const adminEmail = process.env.ADMIN_EMAIL || process.argv[2];
  const adminPassword = process.env.ADMIN_PASSWORD || process.argv[3];

  if (!adminEmail || !adminPassword) {
    console.log('\n⚠️ No ADMIN_EMAIL or ADMIN_PASSWORD specified. Skipping admin account creation.');
    await prisma.$disconnect();
    return;
  }

  console.log('\n2. Creating single Super Admin account...');
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const superAdmin = await prisma.user.create({
    data: {
      email: adminEmail.toLowerCase().trim(),
      name: process.env.ADMIN_NAME || 'Platform Administrator',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerified: new Date(),
    },
  });

  console.log(`  ✓ Super Admin created: ${superAdmin.email}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
