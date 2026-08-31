import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import {
  Users,
  Dumbbell,
  Salad,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { TrainerPlansClient } from "./trainer-plans-client";

export const metadata = {
  title: "Trainer Portal",
};

export default async function TrainerPortalPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/trainer");
  }

  const trainer = await prisma.trainer.findUnique({
    where: { userId: session.user.id },
    include: {
      gym: true,
      user: true,
      members: {
        where: { deletedAt: null },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
          memberships: {
            where: { status: "ACTIVE" },
            include: { plan: { select: { name: true } } },
            take: 1,
          },
          workoutPlans: {
            where: { isActive: true },
            include: {
              exercises: {
                orderBy: { sortOrder: "asc" },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          dietPlans: {
            where: { isActive: true },
            include: {
              meals: {
                orderBy: { sortOrder: "asc" },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!trainer) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-[#E5D9C5] bg-white p-12 py-20 text-center shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
        <p className="font-display text-xl font-bold text-[#33281E]">
          Trainer Profile Not Found
        </p>
        <p className="max-w-sm text-xs text-[#8C7A6B]">
          Your account is not registered as a trainer in any gym workspace.
        </p>
      </div>
    );
  }

  const formattedAssignedMembers = trainer.members.map((m) => ({
    id: m.id,
    memberId: m.memberId,
    user: {
      name: m.user?.name || "Member",
      email: m.user?.email || "—",
      phone: m.user?.phone || null,
    },
    assignedTrainerId: trainer.id,
    assignedTrainerName: trainer.user?.name || "Trainer",
    membershipPlanName: m.memberships[0]?.plan?.name || null,
    isActive: m.isActive,
    activeWorkoutPlan: m.workoutPlans[0]
      ? {
          id: m.workoutPlans[0].id,
          name: m.workoutPlans[0].name,
          exercises: m.workoutPlans[0].exercises.map((e) => ({
            id: e.id,
            dayOfWeek: e.dayOfWeek,
            exerciseName: e.exerciseName,
            sets: e.sets,
            reps: e.reps,
            weight: e.weight,
            restSeconds: e.restSeconds,
          })),
        }
      : null,
    activeDietPlan: m.dietPlans[0]
      ? {
          id: m.dietPlans[0].id,
          name: m.dietPlans[0].name,
          totalCalories: m.dietPlans[0].totalCalories,
          meals: m.dietPlans[0].meals.map((meal) => ({
            id: meal.id,
            mealType: meal.mealType,
            time: meal.time,
            foodItems: meal.foodItems,
            calories: meal.calories,
          })),
        }
      : null,
  }));

  const activeWorkoutsCount = formattedAssignedMembers.filter(
    (m) => !!m.activeWorkoutPlan
  ).length;

  const activeDietsCount = formattedAssignedMembers.filter(
    (m) => !!m.activeDietPlan
  ).length;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-[#E5D9C5] bg-white p-6 md:p-8 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl font-bold tracking-tight text-[#33281E] md:text-4xl">
                Coach {trainer.user.name}
              </h1>
              <Badge variant="default" className="text-xs">
                {trainer.specialization ?? "Fitness Coach"}
              </Badge>
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
                Active Trainer
              </Badge>
            </div>
            <p className="mt-2 max-w-xl text-xs text-[#8C7A6B]">
              Welcome to your Trainer Portal. Author customized workout splits and design macro-balanced nutrition diets exclusively for your assigned athletes.
            </p>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#8B5E34] font-display font-bold text-white shadow-xs">
              {getInitials(trainer.user.name)}
            </div>
            <div>
              <p className="text-xs text-[#8C7A6B]">Assigned Gym</p>
              <p className="font-bold text-sm text-[#33281E]">{trainer.gym.name}</p>
              <p className="font-mono text-[10px] font-bold text-[#8B5E34]">
                {trainer.gym.gymCode}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#8C7A6B]">
              Assigned Clients
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8B5E34]/10 text-[#8B5E34]">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-[#33281E]">
            {formattedAssignedMembers.length}
          </p>
          <p className="mt-1 text-xs text-[#8C7A6B]">Members in your coaching roster</p>
        </div>

        <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#8C7A6B]">
              Active Workout Plans
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
              <Dumbbell className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-[#8B5E34]">
            {activeWorkoutsCount}
          </p>
          <p className="mt-1 text-xs text-[#8C7A6B]">Clients with active workout splits</p>
        </div>

        <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#8C7A6B]">
              Active Diet Charts
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
              <Salad className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-[#33281E]">
            {activeDietsCount}
          </p>
          <p className="mt-1 text-xs text-[#8C7A6B]">Clients on active meal protocols</p>
        </div>
      </div>

      {/* Interactive Plans & Athlete Management Section */}
      <TrainerPlansClient
        trainerId={trainer.id}
        trainerName={trainer.user.name}
        assignedMembers={formattedAssignedMembers}
        gymName={trainer.gym.name}
        gymCode={trainer.gym.gymCode}
      />
    </div>
  );
}
