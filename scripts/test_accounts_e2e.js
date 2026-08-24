require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.log('\n======================================================');
  console.log('  XYRO E2E ACCOUNT CREATION & ROLE AUTHORIZATION TEST');
  console.log('======================================================\n');

  // Common strong password conforming to the new 12+ char security policy
  const STRONG_PASS = 'XyroSecure#2026!';
  const hashedPassword = await bcrypt.hash(STRONG_PASS, 10);

  // -----------------------------------------------------------------
  // 1. CREATE GYM & GYM OWNER
  // -----------------------------------------------------------------
  console.log('[1/4] Setting up Gym Owner & Gym Workspace...');
  const ownerEmail = 'owner@xyrogym.com';
  
  let ownerUser = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!ownerUser) {
    ownerUser = await prisma.user.create({
      data: {
        email: ownerEmail,
        name: 'Aarav Sharma (Gym Owner)',
        phone: '+919876500001',
        password: hashedPassword,
        role: 'GYM_OWNER',
        status: 'ACTIVE',
        emailVerified: new Date(),
      },
    });
  } else {
    ownerUser = await prisma.user.update({
      where: { id: ownerUser.id },
      data: { password: hashedPassword, status: 'ACTIVE', emailVerified: new Date() },
    });
  }

  let gym = await prisma.gym.findUnique({ where: { slug: 'titan-fitness-gym001' } });
  if (!gym) {
    gym = await prisma.gym.create({
      data: {
        name: 'Titan Fitness Arena',
        slug: 'titan-fitness-gym001',
        gymCode: 'GYM_TITAN',
        email: 'contact@titanfitness.com',
        phone: '+919876500001',
        ownerId: ownerUser.id,
        status: 'ACTIVE',
        onboarded: true,
        address: 'Bandra West, Linking Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
      },
    });

    await prisma.gymSettings.create({
      data: {
        gymId: gym.id,
        enableQrCheckin: true,
        enableEmail: true,
        currency: 'INR',
        currencySymbol: '₹',
      },
    });

    await prisma.gymSubscription.create({
      data: {
        gymId: gym.id,
        plan: 'PRO',
        status: 'ACTIVE',
        price: 3499,
        startDate: new Date(),
        endDate: new Date('2099-12-31'),
      },
    });
  }
  console.log(`  ✓ Gym Workspace created: "${gym.name}" (Code: ${gym.gymCode})`);
  console.log(`  ✓ Owner Account: ${ownerUser.email}`);

  // -----------------------------------------------------------------
  // 2. CREATE MEMBERSHIP PLANS
  // -----------------------------------------------------------------
  console.log('\n[2/4] Creating Membership Plans...');
  let plan = await prisma.membershipPlan.findFirst({ where: { gymId: gym.id, name: 'Platinum Elite 12-Month' } });
  if (!plan) {
    plan = await prisma.membershipPlan.create({
      data: {
        gymId: gym.id,
        name: 'Platinum Elite 12-Month',
        description: 'All-access pass + Personal Training + Spa & Sauna',
        price: 18000,
        durationDays: 365,
        isActive: true,
        classesIncluded: true,
        personalTraining: true,
        features: ['Full Gym Access', 'Personal Trainer', 'Diet Plan', 'Steam & Sauna'],
      },
    });
  }
  console.log(`  ✓ Plan created: "${plan.name}" (Price: ₹${plan.price}, Days: ${plan.durationDays})`);

  // -----------------------------------------------------------------
  // 3. CREATE TRAINER ACCOUNT
  // -----------------------------------------------------------------
  console.log('\n[3/4] Creating Trainer Account...');
  const trainerEmail = 'trainer.vikram@xyrogym.com';
  let trainerUser = await prisma.user.findUnique({ where: { email: trainerEmail } });
  if (!trainerUser) {
    trainerUser = await prisma.user.create({
      data: {
        email: trainerEmail,
        name: 'Vikram Rathore (Head Coach)',
        phone: '+919876500002',
        password: hashedPassword,
        role: 'TRAINER',
        status: 'ACTIVE',
        emailVerified: new Date(),
      },
    });
  } else {
    trainerUser = await prisma.user.update({
      where: { id: trainerUser.id },
      data: { password: hashedPassword, status: 'ACTIVE', emailVerified: new Date() },
    });
  }

  let trainer = await prisma.trainer.findUnique({ where: { userId: trainerUser.id } });
  if (!trainer) {
    trainer = await prisma.trainer.create({
      data: {
        gymId: gym.id,
        userId: trainerUser.id,
        specialization: 'Strength Training & Bodybuilding',
        experience: '8+ Years',
        bio: 'Certified CSCS & Sports Nutritionist',
        isActive: true,
      },
    });
  }
  console.log(`  ✓ Trainer Account: ${trainerUser.email} (Specialization: ${trainer.specialization})`);

  // -----------------------------------------------------------------
  // 4. CREATE MEMBER ACCOUNT, ACTIVE MEMBERSHIP, WORKOUT & DIET PLAN
  // -----------------------------------------------------------------
  console.log('\n[4/4] Creating Member Account with Membership & Regimens...');
  const memberEmail = 'member.rohit@xyrogym.com';
  let memberUser = await prisma.user.findUnique({ where: { email: memberEmail } });
  if (!memberUser) {
    memberUser = await prisma.user.create({
      data: {
        email: memberEmail,
        name: 'Rohit Verma (Athlete)',
        phone: '+919876500003',
        password: hashedPassword,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        emailVerified: new Date(),
      },
    });
  } else {
    memberUser = await prisma.user.update({
      where: { id: memberUser.id },
      data: { password: hashedPassword, status: 'ACTIVE', emailVerified: new Date() },
    });
  }

  let member = await prisma.member.findUnique({ where: { userId: memberUser.id } });
  if (!member) {
    member = await prisma.member.create({
      data: {
        memberId: `${gym.gymCode}-001`,
        gymId: gym.id,
        userId: memberUser.id,
        trainerId: trainer.id,
        gender: 'MALE',
        address: 'Bandra West, Mumbai',
        isActive: true,
      },
    });
  }

  // Active membership
  let membership = await prisma.membership.findFirst({ where: { memberId: member.id, gymId: gym.id } });
  if (!membership) {
    const start = new Date();
    const end = new Date(start.getTime() + 365 * 86400000);
    membership = await prisma.membership.create({
      data: {
        gymId: gym.id,
        memberId: member.id,
        planId: plan.id,
        status: 'ACTIVE',
        startDate: start,
        endDate: end,
        daysRemaining: 365,
      },
    });

    await prisma.payment.create({
      data: {
        gymId: gym.id,
        memberId: member.id,
        membershipId: membership.id,
        amount: plan.price,
        totalAmount: plan.price,
        tax: 0,
        discount: 0,
        status: 'PAID',
        method: 'UPI',
        paidAt: new Date(),
        notes: 'Annual Membership fee received',
      },
    });

    // Record attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.attendance.create({
      data: {
        gymId: gym.id,
        memberId: member.id,
        date: today,
        checkIn: new Date(),
        method: 'QR_SCAN',
        staffId: trainerUser.id,
      },
    });
  }


  // Workout plan
  let workout = await prisma.workoutPlan.findFirst({ where: { memberId: member.id } });
  if (!workout) {
    workout = await prisma.workoutPlan.create({
      data: {
        gymId: gym.id,
        memberId: member.id,
        name: 'Hypertrophy 4-Day Split',
        description: 'Targeted strength and muscle gain regimen',
        isActive: true,
        exercises: {
          create: [
            { dayOfWeek: 'MON', exerciseName: 'Barbell Bench Press', sets: 4, reps: '8-10', weight: '80kg' },
            { dayOfWeek: 'MON', exerciseName: 'Incline Dumbbell Press', sets: 3, reps: '10-12', weight: '28kg' },
            { dayOfWeek: 'TUE', exerciseName: 'Barbell Back Squats', sets: 4, reps: '6-8', weight: '120kg' },
            { dayOfWeek: 'THU', exerciseName: 'Overhead Shoulder Press', sets: 4, reps: '8-10', weight: '55kg' },
            { dayOfWeek: 'FRI', exerciseName: 'Deadlifts (Conventional)', sets: 3, reps: '5', weight: '150kg' },
          ],
        },
      },
    });
  }

  // Diet plan
  let diet = await prisma.dietPlan.findFirst({ where: { memberId: member.id } });
  if (!diet) {
    diet = await prisma.dietPlan.create({
      data: {
        gymId: gym.id,
        memberId: member.id,
        name: 'High Protein Muscle Gain Diet',
        description: '2800 kcal clean bulking meal structure',
        totalCalories: 2800,
        isActive: true,
        meals: {
          create: [
            { mealType: 'BREAKFAST', time: '08:00', foodItems: '6 Egg Whites, 2 Whole Eggs, 80g Oatmeal with Berries', calories: 650 },
            { mealType: 'LUNCH', time: '13:00', foodItems: '200g Grilled Chicken Breast, 150g Brown Rice, Broccoli', calories: 750 },
            { mealType: 'PRE_WORKOUT', time: '17:00', foodItems: '1 Banana, 1 Scoop Whey Protein with Water', calories: 300 },
            { mealType: 'DINNER', time: '20:30', foodItems: '200g Paneer/Fish, Sweet Potato, Mixed Green Salad', calories: 700 },
          ],
        },
      },
    });
  }

  console.log(`  ✓ Member Account: ${memberUser.email} (Member ID: ${member.memberId})`);
  console.log(`  ✓ Assigned Trainer: ${trainerUser.name}`);
  console.log(`  ✓ Active Membership: ${plan.name} (Valid 365 days)`);
  console.log(`  ✓ Workout Regimen: "${workout.name}"`);
  console.log(`  ✓ Diet Plan: "${diet.name}" (2800 kcal/day)`);

  // -----------------------------------------------------------------
  // 5. TEST CREDENTIALS VERIFICATION
  // -----------------------------------------------------------------
  console.log('\n------------------------------------------------------');
  console.log('  TESTING BCRYPT AUTHENTICATION FOR ALL 3 ROLES');
  console.log('------------------------------------------------------');

  const testAccounts = [
    { role: 'GYM_OWNER', email: ownerEmail, pass: STRONG_PASS },
    { role: 'TRAINER',   email: trainerEmail, pass: STRONG_PASS },
    { role: 'CUSTOMER',  email: memberEmail, pass: STRONG_PASS },
  ];

  for (const acc of testAccounts) {
    const user = await prisma.user.findUnique({ where: { email: acc.email } });
    const match = await bcrypt.compare(acc.pass, user.password);
    console.log(`  Role [${acc.role}]: ${acc.email} -> Password Check: ${match ? '✅ MATCH (Authenticated)' : '❌ FAILED'}`);
  }

  console.log('\n======================================================');
  console.log('  READY FOR LOGIN TEST AT: http://localhost:3000/login');
  console.log('======================================================\n');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Error during test setup:', e);
  process.exit(1);
});
