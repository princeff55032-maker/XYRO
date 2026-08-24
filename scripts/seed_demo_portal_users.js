require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

async function seed() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.log('Seeding demo portal accounts...');

  // 1. Gym Owner & Gym
  const ownerPass = await bcrypt.hash('Owner123!', 10);
  let owner = await prisma.user.findUnique({ where: { email: 'owner@xyro.test' } });
  if (!owner) {
    owner = await prisma.user.create({
      data: {
        email: 'owner@xyro.test',
        name: 'Alex Mercer (Owner)',
        password: ownerPass,
        role: 'GYM_OWNER',
        status: 'ACTIVE',
      },
    });
  } else {
    await prisma.user.update({
      where: { id: owner.id },
      data: { password: ownerPass, status: 'ACTIVE' },
    });
  }

  let gym = await prisma.gym.findFirst();
  if (!gym) {
    gym = await prisma.gym.create({
      data: {
        name: 'Iron Forge Fitness Club',
        slug: 'iron-forge',
        gymCode: 'GYM_001',
        email: 'contact@ironforge.com',
        phone: '+91 98765 43210',
        ownerId: owner.id,
        status: 'ACTIVE',
        onboarded: true,
      },
    });
    await prisma.gymSettings.create({
      data: {
        gymId: gym.id,
        enableQrCheckin: true,
        enableEmail: true,
      },
    });
  }

  // 2. Membership Plan
  let plan = await prisma.membershipPlan.findFirst({ where: { gymId: gym.id } });
  if (!plan) {
    plan = await prisma.membershipPlan.create({
      data: {
        gymId: gym.id,
        name: 'Gold Annual Pro Plan',
        description: 'Unlimited access + Personal Training + Diet',
        price: 15999,
        durationDays: 365,
        isActive: true,
        classesIncluded: true,
        personalTraining: true,
      },
    });
  }

  // 3. Trainer
  const trainerPass = await bcrypt.hash('Trainer123!', 10);
  let trainerUser = await prisma.user.findUnique({ where: { email: 'trainer@xyro.test' } });
  if (!trainerUser) {
    trainerUser = await prisma.user.create({
      data: {
        email: 'trainer@xyro.test',
        name: 'Coach Marcus Vance',
        phone: '+91 98765 11111',
        password: trainerPass,
        role: 'TRAINER',
        status: 'ACTIVE',
      },
    });
  } else {
    await prisma.user.update({
      where: { id: trainerUser.id },
      data: { password: trainerPass, status: 'ACTIVE' },
    });
  }

  let trainer = await prisma.trainer.findUnique({ where: { userId: trainerUser.id } });
  if (!trainer) {
    trainer = await prisma.trainer.create({
      data: {
        gymId: gym.id,
        userId: trainerUser.id,
        specialization: 'Strength & Hypertrophy Coach',
        experience: '7 years',
        bio: 'Elite fitness coach specialized in powerlifting and body transformation.',
        isActive: true,
      },
    });
  }

  // 4. Gym Member
  const memberPass = await bcrypt.hash('Member123!', 10);
  let memberUser = await prisma.user.findUnique({ where: { email: 'member@xyro.test' } });
  if (!memberUser) {
    memberUser = await prisma.user.create({
      data: {
        email: 'member@xyro.test',
        name: 'Rohan Sharma',
        phone: '+91 98765 22222',
        password: memberPass,
        role: 'CUSTOMER',
        status: 'ACTIVE',
      },
    });
  } else {
    await prisma.user.update({
      where: { id: memberUser.id },
      data: { password: memberPass, status: 'ACTIVE' },
    });
  }

  let member = await prisma.member.findFirst({
    where: {
      OR: [
        { userId: memberUser.id },
        { memberId: `${gym.gymCode}-M-000001` },
      ],
    },
  });

  if (!member) {
    member = await prisma.member.create({
      data: {
        memberId: `${gym.gymCode}-M-000001`,
        gymId: gym.id,
        userId: memberUser.id,
        trainerId: trainer.id,
        isActive: true,
      },
    });
  } else {
    await prisma.member.update({
      where: { id: member.id },
      data: {
        userId: memberUser.id,
        trainerId: trainer.id,
        isActive: true,
      },
    });
  }

  // Active membership for member
  const existingMembership = await prisma.membership.findFirst({
    where: { memberId: member.id },
  });
  if (!existingMembership) {
    const start = new Date();
    const end = new Date(start.getTime() + 180 * 86400000);
    await prisma.membership.create({
      data: {
        gymId: gym.id,
        memberId: member.id,
        planId: plan.id,
        status: 'ACTIVE',
        startDate: start,
        endDate: end,
        daysRemaining: 180,
      },
    });
  }

  // Workout Plan for member
  const existingWorkout = await prisma.workoutPlan.findFirst({
    where: { memberId: member.id },
  });
  if (!existingWorkout) {
    await prisma.workoutPlan.create({
      data: {
        gymId: gym.id,
        memberId: member.id,
        trainerId: trainer.id,
        name: 'Hypertrophy Split 4-Day',
        description: 'Chest, Back, Shoulders & Legs focus',
        isActive: true,
        exercises: {
          create: [
            { dayOfWeek: 'MON', exerciseName: 'Barbell Incline Bench Press', sets: 4, reps: '8-10', weight: '70kg', restSeconds: 90, sortOrder: 1 },
            { dayOfWeek: 'MON', exerciseName: 'Dumbbell Flat Press', sets: 3, reps: '10-12', weight: '28kg', restSeconds: 60, sortOrder: 2 },
            { dayOfWeek: 'TUE', exerciseName: 'Barbell Romanian Deadlift', sets: 4, reps: '8', weight: '100kg', restSeconds: 120, sortOrder: 3 },
            { dayOfWeek: 'THU', exerciseName: 'Overhead Military Press', sets: 4, reps: '8-10', weight: '50kg', restSeconds: 90, sortOrder: 4 },
          ],
        },
      },
    });
  }

  // Diet Plan for member
  const existingDiet = await prisma.dietPlan.findFirst({
    where: { memberId: member.id },
  });
  if (!existingDiet) {
    await prisma.dietPlan.create({
      data: {
        gymId: gym.id,
        memberId: member.id,
        trainerId: trainer.id,
        name: 'High Protein Lean Bulk Diet',
        totalCalories: 2650,
        isActive: true,
        meals: {
          create: [
            { mealType: 'BREAKFAST', time: '08:00 AM', foodItems: 'Oatmeal with Almond Milk, 4 Egg Whites, 1 Scoop Whey Protein, 1 Banana', calories: 650, sortOrder: 1 },
            { mealType: 'LUNCH', time: '01:30 PM', foodItems: 'Grilled Chicken Breast (200g), Brown Rice (150g), Steamed Broccoli & Olive Oil', calories: 750, sortOrder: 2 },
            { mealType: 'PRE_WORKOUT', time: '05:30 PM', foodItems: 'Rice Cakes with Peanut Butter & Espresso', calories: 350, sortOrder: 3 },
            { mealType: 'DINNER', time: '08:30 PM', foodItems: 'Grilled Salmon or Paneer Tikka with Quinoa and Greek Salad', calories: 600, sortOrder: 4 },
          ],
        },
      },
    });
  }

  console.log('Demo records successfully seeded:');
  console.log('🏢 Gym Owner: owner@xyro.test / Owner123!');
  console.log('🏋️ Trainer: trainer@xyro.test / Trainer123!');
  console.log('👤 Member: member@xyro.test OR GYM_001-M-000001 / Member123!');

  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error('Seed error:', e);
  process.exit(1);
});
