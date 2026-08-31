import { requireTenant } from "@/lib/tenant";
import prisma from "@/lib/db";
import { getGymSubscription } from "@/lib/subscriptions";
import { PlanUpgradeGate } from "@/components/dashboard/plan-upgrade-gate";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AddWorkoutDialog, AddDietDialog } from "./workout-form";

export const metadata = { title: "Workouts & Diets" };

export default async function WorkoutsPage() {
  const session = await requireTenant();
  const gymId = session.user.gymId!;

  const { config } = await getGymSubscription(gymId);

  // Feature gate check for Workouts & Diet protocols (Requires Pro / Business tier)
  if (!config.features.workouts_and_diets) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#33281E] tracking-tight">
            Workouts &amp; Nutrition Protocols
          </h1>
          <p className="mt-1 text-xs text-[#8C7A6B]">
            Prescribe periodized workout routines, RPE intensity logs, and macronutrient diet plans.
          </p>
        </div>

        <PlanUpgradeGate
          featureName="Strength &amp; Nutrition Engines"
          requiredTier="Pro"
          requiredPrice="₹3,499/mo"
          description="Empower your coaches to prescribe periodized lifting routines, track progressive overload, and generate individualized macronutrient diet charts."
          highlights={[
            "Custom exercises with sets, reps, and RPE tracking",
            "Individualized caloric & macronutrient targets",
            "Direct member view inside athlete mobile portal",
            "Trainer assignment & client compliance tracking",
          ]}
        />
      </div>
    );
  }

  let workouts: any[] = [];
  let diets: any[] = [];
  let members: any[] = [];

  try {
    const results = await Promise.all([
      prisma.workoutPlan.findMany({
        where: { gymId, isActive: true },
        include: {
          member: { include: { user: { select: { name: true } } } },
          trainer: { include: { user: { select: { name: true } } } },
          _count: { select: { exercises: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
      }),
      prisma.dietPlan.findMany({
        where: { gymId, isActive: true },
        include: {
          member: { include: { user: { select: { name: true } } } },
          _count: { select: { meals: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
      }),
      prisma.member.findMany({
        where: { gymId, isActive: true },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    workouts = results[0];
    diets = results[1];
    members = results[2];
  } catch (err) {
    console.error("[WorkoutsPage Fetch Error]:", err);
  }

  const memberOptions = members.map((m) => ({ id: m.id, label: m.user?.name || "Member" }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E5D9C5] pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#33281E] tracking-tight">Workouts &amp; Nutrition Engines</h1>
          <p className="mt-1 text-xs text-[#8C7A6B]">
            {workouts.length} strength &amp; hypertrophy plan{workouts.length === 1 ? "" : "s"} · {diets.length} macronutrient meal plan{diets.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-3">
          <AddWorkoutDialog members={memberOptions} />
          <AddDietDialog members={memberOptions} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-[#8B5E34]">Workout Protocols (RPE &amp; Progressive Overload)</h2>
          {workouts.length === 0 ? (
            <div className="rounded-3xl border border-[#E5D9C5] bg-white p-8 text-center shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
              <p className="text-xs text-[#8C7A6B]">No workout protocols authored yet. Build your first training split.</p>
            </div>
          ) : (
            workouts.map((w) => (
              <div key={w.id} className="rounded-3xl border border-[#E5D9C5] bg-white p-5 shadow-[0_4px_20px_rgba(51,40,30,0.03)] transition-all duration-300 hover:border-[#8B5E34]">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-base font-bold text-[#33281E]">{w.name}</h3>
                    <p className="truncate text-xs font-medium text-[#8C7A6B]">
                      {w.member?.user?.name || "Member"} {w.trainer?.user?.name ? `· ${w.trainer.user.name}` : ""} · {w._count.exercises} exercises
                    </p>
                  </div>
                  <Badge variant="default" className="font-mono text-[10px]">Active</Badge>
                </div>
                {w.description && (
                  <p className="mt-2.5 text-xs leading-relaxed text-[#8C7A6B]">{w.description}</p>
                )}
                <p className="mt-3 font-mono text-[10px] font-medium text-[#8B5E34]">
                  Updated {formatDate(w.updatedAt)}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="space-y-4">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-[#8B5E34]">Macronutrient &amp; Diet Engines</h2>
          {diets.length === 0 ? (
            <div className="rounded-3xl border border-[#E5D9C5] bg-white p-8 text-center shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
              <p className="text-xs text-[#8C7A6B]">No diet plans created yet. Author your first nutritional meal matrix.</p>
            </div>
          ) : (
            diets.map((d) => (
              <div key={d.id} className="rounded-3xl border border-[#E5D9C5] bg-white p-5 shadow-[0_4px_20px_rgba(51,40,30,0.03)] transition-all duration-300 hover:border-[#8B5E34]">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-base font-bold text-[#33281E]">{d.name}</h3>
                    <p className="truncate text-xs font-medium text-[#8C7A6B]">
                      {d.member?.user?.name || "Member"} · {d._count.meals} meals
                    </p>
                  </div>
                  <Badge variant="default" className="font-mono text-[10px]">Active</Badge>
                </div>
                {d.description && (
                  <p className="mt-2.5 text-xs leading-relaxed text-[#8C7A6B]">{d.description}</p>
                )}
                <p className="mt-3 font-mono text-[10px] font-medium text-[#8B5E34]">
                  {d.totalCalories ? `${d.totalCalories} kcal/day · ` : ""}Updated {formatDate(d.updatedAt)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
