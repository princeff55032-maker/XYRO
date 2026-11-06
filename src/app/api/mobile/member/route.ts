import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getMobileUserId } from "@/lib/mobile-auth";
import { generateMemberQrToken } from "@/lib/qr-token";

async function findMember(userId: string) {
  return prisma.member.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, image: true } },
      gym: { select: { id: true, name: true, gymCode: true, phone: true, address: true } },
      memberships: {
        include: { plan: { select: { name: true, durationDays: true, price: true, features: true } } },
        orderBy: { endDate: "desc" },
        take: 3,
      },
      payments: {
        select: { id: true, totalAmount: true, status: true, method: true, paidAt: true, dueDate: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      attendance: {
        select: { id: true, date: true, checkIn: true, checkOut: true, method: true },
        orderBy: { checkIn: "desc" },
        take: 30,
      },
      workoutPlans: {
        where: { isActive: true },
        include: { exercises: { orderBy: { sortOrder: "asc" } } },
        orderBy: { createdAt: "desc" },
      },
      dietPlans: {
        where: { isActive: true },
        include: { meals: { orderBy: { sortOrder: "asc" } } },
        orderBy: { createdAt: "desc" },
      },
      progressRecords: {
        orderBy: { date: "desc" },
        take: 30,
      },
      assignedTrainer: { select: { user: { select: { name: true, email: true } }, specialization: true } },
    },
  });
}

export async function GET(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const member = await findMember(userId);
  if (!member || member.deletedAt || !member.isActive) {
    return NextResponse.json({ error: "Active member profile not found." }, { status: 404 });
  }

  const activeMembership = member.memberships.find(
    (membership) => membership.status === "ACTIVE" && membership.endDate >= new Date()
  );
  const qrToken = generateMemberQrToken({
    memberId: member.id,
    gymId: member.gymId,
    memberCode: member.memberId,
    gymCode: member.gym.gymCode,
    ttlSeconds: 60,
  });

  return NextResponse.json({
    profile: {
      id: member.id,
      memberId: member.memberId,
      name: member.user.name,
      email: member.user.email,
      phone: member.user.phone,
      image: member.user.image,
      joinDate: member.joinDate,
      trainer: member.assignedTrainer,
    },
    gym: member.gym,
    membership: activeMembership ?? null,
    memberships: member.memberships,
    payments: member.payments,
    attendance: member.attendance,
    workouts: member.workoutPlans,
    diets: member.dietPlans,
    progress: member.progressRecords,
    qr: {
      token: qrToken,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      isValid: Boolean(activeMembership),
    },
  });
}

export async function POST(request: Request) {
  const userId = await getMobileUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const member = await prisma.member.findUnique({ where: { userId }, select: { id: true, isActive: true, deletedAt: true } });
    if (!member || !member.isActive || member.deletedAt) {
      return NextResponse.json({ error: "Active member profile not found." }, { status: 404 });
    }

    const body = (await request.json()) as {
      weight?: number;
      height?: number;
      bodyFat?: number;
      calories?: number;
      waterLiters?: number;
      notes?: string;
    };
    const weight = typeof body.weight === "number" ? body.weight : undefined;
    const height = typeof body.height === "number" ? body.height : undefined;
    const bmi = weight && height && height > 0 ? Number((weight / ((height / 100) ** 2)).toFixed(1)) : null;

    const record = await prisma.progressRecord.create({
      data: {
        memberId: member.id,
        weight,
        height,
        bodyFat: typeof body.bodyFat === "number" ? body.bodyFat : undefined,
        calories: typeof body.calories === "number" ? body.calories : undefined,
        waterLiters: typeof body.waterLiters === "number" ? body.waterLiters : undefined,
        bmi,
        notes: body.notes?.trim() || undefined,
      },
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    console.error("[Mobile Progress Error]:", error);
    return NextResponse.json({ error: "Unable to save progress." }, { status: 500 });
  }
}
