"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Dumbbell,
  Salad,
  Loader2,
  Search,
  Sparkles,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addWorkoutPlanAction,
  addDietPlanAction,
} from "@/app/(dashboard)/actions";
import { getInitials } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Preset Templates for Rapid 1-Click Authoring                       */
/* ------------------------------------------------------------------ */

const WORKOUT_TEMPLATES = [
  {
    name: "Push / Pull / Legs (PPL Hypertrophy)",
    desc: "6-day hypertrophy protocol targeting progressive overload on compound and isolation movements.",
    exercises: `MON | Barbell Bench Press | 4 | 8-10 | 70kg
MON | Incline Dumbbell Press | 3 | 10-12 | 24kg
MON | Cable Chest Flyes | 3 | 12-15 | 15kg
MON | Overhead Tricep Extension | 4 | 12 | 20kg
TUE | Barbell Deadlift | 4 | 6-8 | 100kg
TUE | Lat Pulldown (Wide Grip) | 4 | 10 | 55kg
TUE | Seated Cable Row | 3 | 12 | 50kg
TUE | Barbell Bicep Curl | 4 | 10-12 | 30kg
WED | Barbell Back Squat | 4 | 8-10 | 80kg
WED | Romanian Deadlift | 3 | 10-12 | 60kg
WED | Leg Press | 3 | 12-15 | 140kg
WED | Standing Calf Raise | 4 | 15 | 40kg`,
  },
  {
    name: "Upper / Lower Strength Split",
    desc: "4-day strength and muscular density split for natural lifters.",
    exercises: `MON | Flat Barbell Bench Press | 4 | 5 | 80kg
MON | Barbell Bent-Over Row | 4 | 6 | 70kg
MON | Dumbbell Shoulder Press | 3 | 8 | 26kg
MON | Pull-Ups (Bodyweight/Weighted) | 3 | 8 | Bodyweight
TUE | Barbell Back Squat | 4 | 6 | 90kg
TUE | Romanian Deadlift | 3 | 8 | 70kg
TUE | Bulgarian Split Squats | 3 | 10 | 18kg
TUE | Hanging Leg Raises | 3 | 15 | Bodyweight`,
  },
  {
    name: "Full Body Functional & Conditioning",
    desc: "3-day functional athletic split designed for fat loss and metabolic conditioning.",
    exercises: `MON | Kettlebell Goblet Squat | 4 | 12 | 20kg
MON | Dumbbell Push Press | 4 | 10 | 16kg
MON | Renegade Rows | 3 | 10 | 14kg
MON | Kettlebell Swings | 4 | 20 | 24kg
WED | Trap Bar Deadlift | 4 | 8 | 85kg
WED | Incline Dumbbell Bench | 3 | 10 | 22kg
WED | Medicine Ball Slams | 4 | 15 | 10kg
FRI | Front Squats | 4 | 8 | 60kg
FRI | Neutral Grip Pull-Ups | 3 | 8 | Bodyweight
FRI | Farmer's Walk Carry | 4 | 40m | 28kg`,
  },
];

const DIET_TEMPLATES = [
  {
    name: "2400 kcal High-Protein Lean Bulk",
    calories: "2400",
    desc: "Caloric surplus with 180g protein, ideal for clean muscle building.",
    meals: `BREAKFAST | 08:00 | 4 Whole Eggs, 2 Toast, 1 Banana, Black Coffee | 550
SNACK | 11:00 | Greek Yogurt (200g), Handful Almonds, Blueberries | 300
LUNCH | 14:00 | Grilled Chicken Breast (200g), White Basmati Rice (150g), Steamed Veggies | 650
PRE-WORKOUT | 17:00 | Whey Isolate (1 Scoop), 1 Apple, Rice Cakes with Peanut Butter | 350
DINNER | 20:30 | Paneer Tikka / Salmon (200g), Sweet Potato (200g), Large Green Salad | 550`,
  },
  {
    name: "1800 kcal Cutting & Fat Loss Matrix",
    calories: "1800",
    desc: "Targeted calorie deficit with high satiety whole foods and high protein retention.",
    meals: `BREAKFAST | 08:30 | 3 Egg Whites + 1 Whole Egg Omelet, Spinach, Green Tea | 250
SNACK | 11:30 | Whey Protein (1 Scoop in Water), 10 Almonds | 180
LUNCH | 13:30 | Chicken Breast (200g), Mixed Salad, Olive Oil (1 tsp), Brown Rice (80g) | 500
SNACK | 17:00 | Black Coffee, 1 Banana | 100
DINNER | 20:00 | Sautéed Tofu / White Fish (200g), Broccoli & Asparagus, Light Dal | 450
BEDTIME | 22:00 | Casein Protein or 100g Cottage Cheese | 150`,
  },
  {
    name: "2100 kcal Vegetarian Performance Diet",
    calories: "2100",
    desc: "High protein lacto-vegetarian diet with balanced micronutrients.",
    meals: `BREAKFAST | 08:00 | Oats with Milk, Chia Seeds, Whey Protein Scoop, Honey | 500
SNACK | 11:00 | Roasted Chickpeas (100g), Coconut Water | 250
LUNCH | 13:30 | Paneer Curry (150g), 2 Multigrain Roti, Dal Tadka, Cucumber Raita | 600
PRE-WORKOUT | 17:00 | 2 Boiled Potatoes with Chaat Masala, Green Tea | 200
DINNER | 20:30 | Soya Chunks (80g dry), Sautéed Vegetables, 1 Roti, Salad | 450
BEDTIME | 22:00 | Warm Turmeric Milk (250ml) | 100`,
  },
];

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export interface MemberItem {
  id: string;
  memberId: string;
  user: {
    name: string;
    email: string;
    phone?: string | null;
  };
  assignedTrainerId?: string | null;
  assignedTrainerName?: string | null;
  membershipPlanName?: string | null;
  isActive: boolean;
  activeWorkoutPlan?: {
    id: string;
    name: string;
    exercises: {
      id: string;
      dayOfWeek: string;
      exerciseName: string;
      sets: number;
      reps: string;
      weight?: string | null;
      restSeconds: number;
    }[];
  } | null;
  activeDietPlan?: {
    id: string;
    name: string;
    totalCalories?: number | string | null;
    meals: {
      id: string;
      mealType: string;
      time?: string | null;
      foodItems: string;
      calories?: number | string | null;
    }[];
  } | null;
}

export function TrainerPlansClient({
  trainerName,
  assignedMembers,
}: {
  trainerId: string;
  trainerName: string;
  assignedMembers: MemberItem[];
  gymName: string;
  gymCode: string;
}) {
  const router = useRouter();

  // Search Filter
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog State: Workout
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [workoutMemberId, setWorkoutMemberId] = useState("");
  const [workoutName, setWorkoutName] = useState("");
  const [workoutDesc, setWorkoutDesc] = useState("");
  const [workoutExercises, setWorkoutExercises] = useState("");
  const [workoutLoading, setWorkoutLoading] = useState(false);
  const [workoutError, setWorkoutError] = useState<string | null>(null);

  // Dialog State: Diet
  const [dietOpen, setDietOpen] = useState(false);
  const [dietMemberId, setDietMemberId] = useState("");
  const [dietName, setDietName] = useState("");
  const [dietCalories, setDietCalories] = useState("");
  const [dietDesc, setDietDesc] = useState("");
  const [dietMeals, setDietMeals] = useState("");
  const [dietLoading, setDietLoading] = useState(false);
  const [dietError, setDietError] = useState<string | null>(null);

  // Inspect Plan Modal State
  const [inspectWorkout, setInspectWorkout] = useState<MemberItem["activeWorkoutPlan"] | null>(null);
  const [inspectDiet, setInspectDiet] = useState<MemberItem["activeDietPlan"] | null>(null);

  /* ─── Handlers ─────────────────────────────────────────────────── */

  const openWorkoutForMember = (memberId: string) => {
    setWorkoutMemberId(memberId);
    setWorkoutError(null);
    if (!workoutName) {
      setWorkoutName("Hypertrophy Split Phase 1");
      setWorkoutDesc("Custom resistance training protocol tailored for athlete's goal");
      setWorkoutExercises(WORKOUT_TEMPLATES[0].exercises);
    }
    setWorkoutOpen(true);
  };

  const openDietForMember = (memberId: string) => {
    setDietMemberId(memberId);
    setDietError(null);
    if (!dietName) {
      setDietName(DIET_TEMPLATES[0].name);
      setDietCalories(DIET_TEMPLATES[0].calories);
      setDietDesc(DIET_TEMPLATES[0].desc);
      setDietMeals(DIET_TEMPLATES[0].meals);
    }
    setDietOpen(true);
  };

  const handleWorkoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workoutMemberId) {
      setWorkoutError("Please select an assigned athlete.");
      return;
    }
    setWorkoutLoading(true);
    setWorkoutError(null);

    const res = await addWorkoutPlanAction({
      memberId: workoutMemberId,
      name: workoutName,
      description: workoutDesc || undefined,
      exercises: workoutExercises,
    });

    setWorkoutLoading(false);
    if (!res.ok) {
      setWorkoutError(res.error || "Failed to create workout plan");
      return;
    }

    setWorkoutOpen(false);
    setWorkoutName("");
    setWorkoutDesc("");
    setWorkoutExercises("");
    router.refresh();
  };

  const handleDietSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dietMemberId) {
      setDietError("Please select an assigned athlete.");
      return;
    }
    setDietLoading(true);
    setDietError(null);

    const res = await addDietPlanAction({
      memberId: dietMemberId,
      name: dietName,
      description: dietDesc || undefined,
      totalCalories: dietCalories || undefined,
      meals: dietMeals,
    });

    setDietLoading(false);
    if (!res.ok) {
      setDietError(res.error || "Failed to create diet plan");
      return;
    }

    setDietOpen(false);
    setDietName("");
    setDietCalories("");
    setDietDesc("");
    setDietMeals("");
    router.refresh();
  };

  /* ─── Filtering ────────────────────────────────────────────────── */

  const filteredAssigned = assignedMembers.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.user.name.toLowerCase().includes(q) ||
      m.memberId.toLowerCase().includes(q) ||
      m.user.email.toLowerCase().includes(q) ||
      (m.user.phone && m.user.phone.includes(q))
    );
  });

  const inputCls =
    "h-10 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none transition focus:border-[#8B5E34] focus:ring-2 focus:ring-[#8B5E34]/15";
  const areaCls =
    "w-full rounded-xl border border-[#E5D9C5] bg-white p-3 font-mono text-xs leading-relaxed text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none transition focus:border-[#8B5E34] focus:ring-2 focus:ring-[#8B5E34]/15";

  return (
    <div className="space-y-6">
      {/* Action Bar & Quick Creation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#E5D9C5] bg-white p-5 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
        <div className="flex flex-1 items-center gap-3 min-w-[240px] max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C7A6B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your assigned athlete..."
              className="h-10 w-full rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] pl-10 pr-3 text-xs text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none focus:border-[#8B5E34] focus:bg-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            disabled={assignedMembers.length === 0}
            onClick={() => openWorkoutForMember(assignedMembers[0]?.id || "")}
            className="btn-primary h-10 rounded-xl px-4 text-xs font-bold text-white shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Dumbbell className="mr-2 h-4 w-4 text-white" />
            + Author Workout Plan
          </Button>

          <Button
            type="button"
            disabled={assignedMembers.length === 0}
            onClick={() => openDietForMember(assignedMembers[0]?.id || "")}
            className="inline-flex items-center gap-2 h-10 rounded-xl border border-[#E5D9C5] bg-[#FAF9F7] px-4 text-xs font-bold text-[#33281E] hover:bg-[#F3EFEA] hover:border-[#8B5E34] transition cursor-pointer disabled:opacity-50"
          >
            <Salad className="h-4 w-4 text-[#8B5E34]" />
            + Author Diet Plan
          </Button>
        </div>
      </div>

      {/* Main Assigned Members Coaching Section */}
      <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 md:p-8 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5D9C5] pb-4 mb-6">
          <div>
            <h3 className="font-display text-lg font-bold text-[#33281E]">
              My Assigned Athletes ({filteredAssigned.length})
            </h3>
            <p className="text-xs text-[#8C7A6B]">
              Athletes assigned to Coach {trainerName}. You can create and update workout protocols and nutrition plans exclusively for your assigned members.
            </p>
          </div>

          <Badge variant="outline" className="border-[#E5D9C5] bg-[#FAF9F7] text-xs text-[#8C7A6B]">
            <Info className="mr-1.5 h-3.5 w-3.5 text-[#8B5E34]" />
            Assigned Members Only
          </Badge>
        </div>

        {filteredAssigned.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F9F8F6] border border-[#E5D9C5] text-[#8C7A6B] mb-3">
              <Users className="h-7 w-7" />
            </div>
            <p className="text-sm font-bold text-[#33281E]">No assigned athletes yet</p>
            <p className="text-xs text-[#8C7A6B] max-w-sm mt-1">
              Your gym administrator will assign athletes to your coaching roster. Once assigned, you will be able to author personalized workouts and diet schedules for them.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredAssigned.map((member) => (
              <div
                key={member.id}
                className="flex flex-col justify-between rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-5 transition hover:shadow-sm"
              >
                <div>
                  {/* Top Header: Avatar + Details */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8B5E34] font-display text-sm font-bold text-white shadow-xs">
                        {getInitials(member.user.name)}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[#33281E]">
                          {member.user.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-xs font-bold text-[#8B5E34]">
                            {member.memberId}
                          </span>
                          <span className="text-[11px] text-[#8C7A6B]">
                            {member.membershipPlanName || "Standard Pass"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant={member.isActive ? "success" : "secondary"}
                      className="text-[10px]"
                    >
                      {member.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#8C7A6B]">
                    <span>✉️ {member.user.email}</span>
                    {member.user.phone && <span>📞 {member.user.phone}</span>}
                  </div>

                  {/* Plan Status Badges */}
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#E5D9C5] pt-3">
                    <div className="rounded-xl border border-[#E5D9C5] bg-white p-2.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#8C7A6B]">
                        <span className="flex items-center gap-1">
                          <Dumbbell className="h-3 w-3 text-[#8B5E34]" /> Workout
                        </span>
                        {member.activeWorkoutPlan && (
                          <button
                            type="button"
                            onClick={() => setInspectWorkout(member.activeWorkoutPlan)}
                            className="text-[#8B5E34] hover:underline font-bold text-[10px] cursor-pointer"
                          >
                            View
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-bold text-[#33281E] truncate">
                        {member.activeWorkoutPlan ? member.activeWorkoutPlan.name : "None Assigned"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#E5D9C5] bg-white p-2.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#8C7A6B]">
                        <span className="flex items-center gap-1">
                          <Salad className="h-3 w-3 text-emerald-700" /> Diet Plan
                        </span>
                        {member.activeDietPlan && (
                          <button
                            type="button"
                            onClick={() => setInspectDiet(member.activeDietPlan)}
                            className="text-emerald-700 hover:underline font-bold text-[10px] cursor-pointer"
                          >
                            View
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-bold text-[#33281E] truncate">
                        {member.activeDietPlan ? member.activeDietPlan.name : "None Assigned"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-[#E5D9C5] pt-3">
                  <Button
                    type="button"
                    onClick={() => openWorkoutForMember(member.id)}
                    className="btn-primary h-8 px-3 rounded-lg text-[11px] font-bold text-white cursor-pointer"
                  >
                    <Dumbbell className="mr-1.5 h-3 w-3" />
                    {member.activeWorkoutPlan ? "Update Workout" : "+ Assign Workout"}
                  </Button>

                  <Button
                    type="button"
                    onClick={() => openDietForMember(member.id)}
                    className="h-8 px-3 rounded-lg border border-[#E5D9C5] bg-white text-[11px] font-bold text-[#33281E] hover:bg-[#F3EFEA] hover:border-[#8B5E34] transition cursor-pointer"
                  >
                    <Salad className="mr-1.5 h-3 w-3 text-[#8B5E34]" />
                    {member.activeDietPlan ? "Update Diet" : "+ Assign Diet"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── MODAL 1: Author Workout Plan ──────────────────────────── */}
      <Dialog open={workoutOpen} onOpenChange={setWorkoutOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-[#8B5E34]" />
              Author Workout Split Protocol
            </DialogTitle>
            <DialogDescription>
              Assign a progressive training split directly to your assigned athlete.
            </DialogDescription>
          </DialogHeader>

          {workoutError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
              {workoutError}
            </div>
          )}

          {/* Preset Template Quick-Picks */}
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8C7A6B]">
              Quick-Load Preset Template:
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {WORKOUT_TEMPLATES.map((tmpl, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => {
                    setWorkoutName(tmpl.name);
                    setWorkoutDesc(tmpl.desc);
                    setWorkoutExercises(tmpl.exercises);
                  }}
                  className="rounded-lg border border-[#E5D9C5] bg-[#FAF9F7] px-2.5 py-1 text-[11px] font-semibold text-[#8B5E34] hover:bg-[#8B5E34] hover:text-white transition cursor-pointer"
                >
                  ⚡ {tmpl.name.split("(")[0]}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleWorkoutSubmit} className="space-y-4 pt-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                  Assigned Athlete *
                </label>
                <select
                  required
                  value={workoutMemberId}
                  onChange={(e) => setWorkoutMemberId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">-- Select Assigned Athlete --</option>
                  {assignedMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.user.name} ({m.memberId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                  Plan Name *
                </label>
                <input
                  required
                  value={workoutName}
                  onChange={(e) => setWorkoutName(e.target.value)}
                  placeholder="e.g. 6-Day PPL Hypertrophy"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                Protocol Objective / Notes
              </label>
              <input
                value={workoutDesc}
                onChange={(e) => setWorkoutDesc(e.target.value)}
                placeholder="e.g. Focus on progressive overload on compound lifts"
                className={inputCls}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                Exercise Split Matrix (DAY | Exercise | Sets | Reps | Weight) *
              </label>
              <textarea
                required
                rows={6}
                value={workoutExercises}
                onChange={(e) => setWorkoutExercises(e.target.value)}
                placeholder="MON | Bench Press | 4 | 8-10 | 70kg&#10;MON | Incline Dumbbell | 3 | 10-12 | 24kg&#10;TUE | Barbell Squats | 4 | 6-8 | 90kg"
                className={areaCls}
              />
              <p className="mt-1 text-[10px] font-mono text-[#8C7A6B]">
                Format: <code>DAY | Exercise Name | Sets | Reps | Weight</code> (one exercise per line)
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E5D9C5]">
              <button
                type="button"
                onClick={() => setWorkoutOpen(false)}
                className="h-10 px-4 text-xs font-semibold text-[#8C7A6B] hover:text-[#33281E] cursor-pointer"
              >
                Cancel
              </button>
              <Button
                type="submit"
                disabled={workoutLoading || assignedMembers.length === 0}
                className="btn-primary h-10 px-6 rounded-xl text-xs font-bold text-white cursor-pointer disabled:opacity-50"
              >
                {workoutLoading ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Assigning Plan…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    Save &amp; Assign Workout Plan
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: Author Diet Plan ─────────────────────────────── */}
      <Dialog open={dietOpen} onOpenChange={setDietOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Salad className="h-5 w-5 text-emerald-700" />
              Author Nutrition &amp; Macro Meal Plan
            </DialogTitle>
            <DialogDescription>
              Assign a daily macronutrient and caloric meal plan to your assigned athlete.
            </DialogDescription>
          </DialogHeader>

          {dietError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
              {dietError}
            </div>
          )}

          {/* Preset Template Quick-Picks */}
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8C7A6B]">
              Quick-Load Nutrition Template:
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {DIET_TEMPLATES.map((tmpl, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => {
                    setDietName(tmpl.name);
                    setDietCalories(tmpl.calories);
                    setDietDesc(tmpl.desc);
                    setDietMeals(tmpl.meals);
                  }}
                  className="rounded-lg border border-[#E5D9C5] bg-[#FAF9F7] px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-700 hover:text-white transition cursor-pointer"
                >
                  🥗 {tmpl.name.split(" ")[0]} ({tmpl.calories} kcal)
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleDietSubmit} className="space-y-4 pt-2">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                  Assigned Athlete *
                </label>
                <select
                  required
                  value={dietMemberId}
                  onChange={(e) => setDietMemberId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">-- Select Assigned Athlete --</option>
                  {assignedMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.user.name} ({m.memberId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                  Plan Name *
                </label>
                <input
                  required
                  value={dietName}
                  onChange={(e) => setDietName(e.target.value)}
                  placeholder="e.g. 2400 kcal Lean Bulk"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                  Target Calories
                </label>
                <input
                  value={dietCalories}
                  onChange={(e) => setDietCalories(e.target.value)}
                  placeholder="e.g. 2400"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                Dietary Notes &amp; Guidelines
              </label>
              <input
                value={dietDesc}
                onChange={(e) => setDietDesc(e.target.value)}
                placeholder="e.g. Drink 3.5L water daily, take post-workout shake within 30 min"
                className={inputCls}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                Daily Meals Matrix (MEAL | Time | Food Items | Calories) *
              </label>
              <textarea
                required
                rows={6}
                value={dietMeals}
                onChange={(e) => setDietMeals(e.target.value)}
                placeholder="BREAKFAST | 08:00 | 4 Eggs, 2 Toast, 1 Banana | 550&#10;LUNCH | 13:30 | Chicken Breast (200g), Rice (150g), Salad | 650&#10;DINNER | 20:00 | Paneer / Fish (200g), Vegetables, 1 Roti | 450"
                className={areaCls}
              />
              <p className="mt-1 text-[10px] font-mono text-[#8C7A6B]">
                Format: <code>MEAL_TYPE | HH:MM | Food Items List | Approx Calories</code>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E5D9C5]">
              <button
                type="button"
                onClick={() => setDietOpen(false)}
                className="h-10 px-4 text-xs font-semibold text-[#8C7A6B] hover:text-[#33281E] cursor-pointer"
              >
                Cancel
              </button>
              <Button
                type="submit"
                disabled={dietLoading || assignedMembers.length === 0}
                className="btn-primary h-10 px-6 rounded-xl text-xs font-bold text-white cursor-pointer disabled:opacity-50"
              >
                {dietLoading ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Assigning Plan…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    Save &amp; Assign Nutrition Plan
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: Inspect Workout Details ──────────────────────── */}
      {inspectWorkout && (
        <Dialog open={!!inspectWorkout} onOpenChange={() => setInspectWorkout(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-[#8B5E34]" />
                {inspectWorkout.name}
              </DialogTitle>
              <DialogDescription>
                Assigned training split and exercise schedule.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-3 space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {inspectWorkout.exercises.map((ex) => (
                <div
                  key={ex.id}
                  className="flex items-center justify-between rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] p-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-[#8B5E34]/15 px-2 py-0.5 font-mono text-[10px] font-bold text-[#8B5E34]">
                        {ex.dayOfWeek}
                      </span>
                      <p className="font-bold text-[#33281E]">{ex.exerciseName}</p>
                    </div>
                    <p className="mt-1 text-[11px] text-[#8C7A6B]">
                      {ex.sets} Sets × {ex.reps} Reps {ex.weight ? `@ ${ex.weight}` : ""}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-[#8C7A6B]">
                    {ex.restSeconds}s rest
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                onClick={() => setInspectWorkout(null)}
                className="btn-primary h-9 px-5 text-xs text-white font-bold rounded-xl"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── MODAL 4: Inspect Diet Details ─────────────────────────── */}
      {inspectDiet && (
        <Dialog open={!!inspectDiet} onOpenChange={() => setInspectDiet(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Salad className="h-5 w-5 text-emerald-700" />
                {inspectDiet.name}
              </DialogTitle>
              <DialogDescription>
                {inspectDiet.totalCalories ? `${inspectDiet.totalCalories} kcal/day target` : "Daily meal protocol"}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-3 space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {inspectDiet.meals.map((meal) => (
                <div
                  key={meal.id}
                  className="rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] p-3 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                      {meal.mealType}
                    </span>
                    {meal.time && (
                      <span className="font-mono text-[10px] text-[#8C7A6B]">
                        {meal.time}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-[#33281E]">{meal.foodItems}</p>
                  {meal.calories && (
                    <p className="text-[11px] text-[#8C7A6B]">Approx {meal.calories} kcal</p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                onClick={() => setInspectDiet(null)}
                className="btn-primary h-9 px-5 text-xs text-white font-bold rounded-xl"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
