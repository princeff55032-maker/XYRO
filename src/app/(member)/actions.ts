"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export type ActionResult<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export async function saveBodyMetricsAction(data: {
  weight: number;
  height: number;
  bmi: number;
  bodyFat?: number;
  notes?: string;
}): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "Unauthorized. Please log in." };
    }

    const member = await prisma.member.findUnique({
      where: { userId: session.user.id },
      select: { id: true, gymId: true },
    });

    if (!member) {
      return { ok: false, error: "Member profile not found." };
    }

    const record = await prisma.progressRecord.create({
      data: {
        memberId: member.id,
        weight: data.weight,
        height: data.height,
        bmi: data.bmi,
        bodyFat: data.bodyFat,
        notes: data.notes ?? `BMI: ${data.bmi.toFixed(1)} | Height: ${data.height}cm | Weight: ${data.weight}kg`,
      },
    });

    revalidatePath("/member");
    return { ok: true, data: record };
  } catch (err) {
    console.error("Failed to save body metrics:", err);
    return { ok: false, error: "Failed to record body metrics." };
  }
}

export async function saveDailyNutritionLogAction(data: {
  date: string;
  totalCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  mealsJson: string;
}): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "Unauthorized. Please log in." };
    }

    const member = await prisma.member.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!member) {
      return { ok: false, error: "Member profile not found." };
    }

    // Save summary log into ProgressRecord notes as structured JSON
    const noteContent = JSON.stringify({
      type: "DAILY_NUTRITION_LOG",
      date: data.date,
      calories: data.totalCalories,
      protein: data.proteinGrams,
      carbs: data.carbsGrams,
      fats: data.fatsGrams,
      meals: JSON.parse(data.mealsJson),
    });

    const record = await prisma.progressRecord.create({
      data: {
        memberId: member.id,
        notes: noteContent,
      },
    });

    revalidatePath("/member");
    return { ok: true, data: record };
  } catch (err) {
    console.error("Failed to save daily nutrition log:", err);
    return { ok: false, error: "Failed to record daily nutrition log." };
  }
}
