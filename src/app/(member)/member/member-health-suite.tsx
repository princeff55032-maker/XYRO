"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Scale,
  Salad,
  Flame,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Activity,
  Calculator,
  Utensils,
  Apple,
  Clock,
  ArrowRight,
  Info,
  Save,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { saveBodyMetricsAction, saveDailyNutritionLogAction } from "../actions";

interface FoodItem {
  id: string;
  mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Pre-Workout" | "Post-Workout";
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  time: string;
}

const PRESET_MEALS: Omit<FoodItem, "id" | "time">[] = [
  { mealType: "Breakfast", name: "Oats with Whey & Banana", portion: "1 bowl (60g oats)", calories: 420, protein: 32, carbs: 58, fats: 6 },
  { mealType: "Breakfast", name: "3 Boiled Eggs & Whole Wheat Toast", portion: "3 eggs + 2 slices", calories: 340, protein: 22, carbs: 26, fats: 16 },
  { mealType: "Lunch", name: "Grilled Chicken Breast with Brown Rice", portion: "150g chicken + 150g rice", calories: 510, protein: 44, carbs: 62, fats: 7 },
  { mealType: "Lunch", name: "Paneer & Mixed Veg Bowl", portion: "150g paneer + veggies", calories: 380, protein: 24, carbs: 16, fats: 25 },
  { mealType: "Post-Workout", name: "Whey Protein Shake", portion: "1 scoop in water", calories: 120, protein: 25, carbs: 2, fats: 1 },
  { mealType: "Snack", name: "Greek Yogurt with Berries & Almonds", portion: "1 cup (150g)", calories: 210, protein: 18, carbs: 15, fats: 8 },
  { mealType: "Dinner", name: "Fish / Tofu with Quinoa & Steamed Broccoli", portion: "1 plate", calories: 460, protein: 38, carbs: 48, fats: 12 },
];

export function MemberHealthSuite({
  memberName,
  memberId,
  initialWeight,
  initialHeight,
}: {
  memberName: string;
  memberId: string;
  initialWeight?: number | null;
  initialHeight?: number | null;
}) {
  const [activeTab, setActiveTab] = useState<"food" | "bmi">("food");

  // ----------------------------------------------------
  // 1. BMI & TDEE / Macro Calculator State
  // ----------------------------------------------------
  const [heightCm, setHeightCm] = useState<number>(initialHeight ?? 175);
  const [weightKg, setWeightKg] = useState<number>(initialWeight ?? 72);
  const [age, setAge] = useState<number>(25);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [activity, setActivity] = useState<number>(1.55); // 1.2 = Sedentary, 1.375 = Light, 1.55 = Moderate, 1.725 = Heavy
  const [goal, setGoal] = useState<"cut" | "maintain" | "bulk">("maintain");
  const [savingMetrics, setSavingMetrics] = useState(false);
  const [metricSuccess, setMetricSuccess] = useState(false);

  // BMI Calculation
  const bmi = useMemo(() => {
    if (!heightCm || !weightKg || heightCm <= 0) return 0;
    const heightMeters = heightCm / 100;
    return +(weightKg / (heightMeters * heightMeters)).toFixed(1);
  }, [heightCm, weightKg]);

  const bmiCategory = useMemo(() => {
    if (bmi < 18.5) return { label: "Underweight", color: "text-sky-800 bg-sky-50 border-sky-200", barColor: "bg-sky-500", advice: "Caloric surplus recommended to build lean mass." };
    if (bmi < 25) return { label: "Normal / Healthy Weight", color: "text-emerald-800 bg-emerald-50 border-emerald-200", barColor: "bg-emerald-600", advice: "Ideal metabolic range. Focus on progressive overload & maintenance." };
    if (bmi < 30) return { label: "Overweight", color: "text-amber-800 bg-amber-50 border-amber-200", barColor: "bg-amber-500", advice: "Moderate caloric deficit with resistance training recommended." };
    return { label: "Obese", color: "text-red-700 bg-red-50 border-red-200", barColor: "bg-red-600", advice: "Consult your gym coach for a guided sustainable fat-loss protocol." };
  }, [bmi]);

  // Ideal weight range for height
  const idealWeightRange = useMemo(() => {
    const heightM = heightCm / 100;
    const minW = (18.5 * heightM * heightM).toFixed(1);
    const maxW = (24.9 * heightM * heightM).toFixed(1);
    return `${minW} kg – ${maxW} kg`;
  }, [heightCm]);

  // BMR & TDEE Calculations (Mifflin-St Jeor)
  const bmr = useMemo(() => {
    if (gender === "male") {
      return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
    }
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
  }, [gender, weightKg, heightCm, age]);

  const tdee = useMemo(() => Math.round(bmr * activity), [bmr, activity]);

  const targetCalories = useMemo(() => {
    if (goal === "cut") return tdee - 450;
    if (goal === "bulk") return tdee + 350;
    return tdee;
  }, [tdee, goal]);

  // Calculated Macro Targets
  const targetProtein = useMemo(() => Math.round(weightKg * 2.0), [weightKg]); // 2g per kg
  const targetFats = useMemo(() => Math.round((targetCalories * 0.25) / 9), [targetCalories]); // 25% of calories
  const targetCarbs = useMemo(() => {
    const proteinKcal = targetProtein * 4;
    const fatsKcal = targetFats * 9;
    const remainingKcal = Math.max(0, targetCalories - (proteinKcal + fatsKcal));
    return Math.round(remainingKcal / 4);
  }, [targetCalories, targetProtein, targetFats]);

  // ----------------------------------------------------
  // 2. Daily Food Log & Whole Day Analysis State
  // ----------------------------------------------------
  const [foods, setFoods] = useState<FoodItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`xyro_food_log_${memberId}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // fallback
        }
      }
    }
    return [
      {
        id: "1",
        mealType: "Breakfast",
        name: "Oats with Whey & Banana",
        portion: "1 bowl (60g)",
        calories: 420,
        protein: 32,
        carbs: 58,
        fats: 6,
        time: "08:30 AM",
      },
      {
        id: "2",
        mealType: "Lunch",
        name: "Grilled Chicken Breast with Brown Rice",
        portion: "1 plate",
        calories: 510,
        protein: 44,
        carbs: 62,
        fats: 7,
        time: "01:15 PM",
      },
    ];
  });

  // Persist to local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`xyro_food_log_${memberId}`, JSON.stringify(foods));
    }
  }, [foods, memberId]);

  // New item form
  const [newMealType, setNewMealType] = useState<FoodItem["mealType"]>("Snack");
  const [newName, setNewName] = useState("");
  const [newPortion, setNewPortion] = useState("");
  const [newCalories, setNewCalories] = useState<string>("");
  const [newProtein, setNewProtein] = useState<string>("");
  const [newCarbs, setNewCarbs] = useState<string>("");
  const [newFats, setNewFats] = useState<string>("");
  const [savingDailySync, setSavingDailySync] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const handleAddCustomFood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCalories) return;

    const item: FoodItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      mealType: newMealType,
      name: newName.trim(),
      portion: newPortion.trim() || "1 serving",
      calories: Number(newCalories) || 0,
      protein: Number(newProtein) || 0,
      carbs: Number(newCarbs) || 0,
      fats: Number(newFats) || 0,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setFoods((prev) => [item, ...prev]);
    setNewName("");
    setNewPortion("");
    setNewCalories("");
    setNewProtein("");
    setNewCarbs("");
    setNewFats("");
  };

  const handleAddPreset = (preset: (typeof PRESET_MEALS)[0]) => {
    const item: FoodItem = {
      ...preset,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setFoods((prev) => [item, ...prev]);
  };

  const handleDeleteFood = (id: string) => {
    setFoods((prev) => prev.filter((f) => f.id !== id));
  };

  const handleClearDay = () => {
    if (confirm("Reset and clear all logged meals for today?")) {
      setFoods([]);
    }
  };

  // Whole Day Cumulative Totals
  const dayTotals = useMemo(() => {
    return foods.reduce(
      (acc, curr) => ({
        calories: acc.calories + curr.calories,
        protein: acc.protein + curr.protein,
        carbs: acc.carbs + curr.carbs,
        fats: acc.fats + curr.fats,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }, [foods]);

  const caloriesRemaining = targetCalories - dayTotals.calories;
  const caloriesPercent = Math.min(100, Math.round((dayTotals.calories / targetCalories) * 100)) || 0;
  const proteinPercent = Math.min(100, Math.round((dayTotals.protein / targetProtein) * 100)) || 0;
  const carbsPercent = Math.min(100, Math.round((dayTotals.carbs / targetCarbs) * 100)) || 0;
  const fatsPercent = Math.min(100, Math.round((dayTotals.fats / targetFats) * 100)) || 0;

  // Macro Energy Distribution
  const totalMacroKcal = dayTotals.protein * 4 + dayTotals.carbs * 4 + dayTotals.fats * 9;
  const proteinRatio = totalMacroKcal ? Math.round(((dayTotals.protein * 4) / totalMacroKcal) * 100) : 0;
  const carbsRatio = totalMacroKcal ? Math.round(((dayTotals.carbs * 4) / totalMacroKcal) * 100) : 0;
  const fatsRatio = totalMacroKcal ? Math.round(((dayTotals.fats * 9) / totalMacroKcal) * 100) : 0;

  // Server Actions
  const handleSaveMetrics = async () => {
    setSavingMetrics(true);
    setMetricSuccess(false);
    const res = await saveBodyMetricsAction({
      height: heightCm,
      weight: weightKg,
      bmi: bmi,
      notes: `BMI: ${bmi} (${bmiCategory.label}) | TDEE: ${tdee} kcal | Goal: ${goal.toUpperCase()}`,
    });
    setSavingMetrics(false);
    if (res.ok) {
      setMetricSuccess(true);
      setTimeout(() => setMetricSuccess(false), 4000);
    }
  };

  const handleSyncToGymCloud = async () => {
    setSavingDailySync(true);
    setSyncSuccess(false);
    const res = await saveDailyNutritionLogAction({
      date: new Date().toISOString().split("T")[0],
      totalCalories: dayTotals.calories,
      proteinGrams: dayTotals.protein,
      carbsGrams: dayTotals.carbs,
      fatsGrams: dayTotals.fats,
      mealsJson: JSON.stringify(foods),
    });
    setSavingDailySync(false);
    if (res.ok) {
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 4000);
    }
  };

  return (
    <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 md:p-8 shadow-[0_4px_20px_rgba(51,40,30,0.03)] space-y-6">
      {/* Header with Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5D9C5] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8B5E34] text-white shadow-xs">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-[#33281E]">
                Member Nutrition & Body Analytics
              </h2>
              <p className="text-xs text-[#8C7A6B]">
                Track daily intake, analyze macros, and calculate your target energy expenditure
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("food")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              activeTab === "food"
                ? "bg-[#8B5E34] text-white shadow-xs"
                : "text-[#8C7A6B] hover:text-[#33281E]"
            }`}
          >
            <Salad className="h-3.5 w-3.5" />
            <span>Whole Day Food Record</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("bmi")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              activeTab === "bmi"
                ? "bg-[#8B5E34] text-white shadow-xs"
                : "text-[#8C7A6B] hover:text-[#33281E]"
            }`}
          >
            <Scale className="h-3.5 w-3.5" />
            <span>BMI & Macro Calculator</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: WHOLE DAY FOOD LOG & MACRO ANALYSIS */}
      {/* ======================================================== */}
      {activeTab === "food" && (
        <div className="space-y-6 animate-fade-up">
          {/* Top Live Daily Macro Rings / Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Calories Card */}
            <div className="rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-[#8C7A6B] uppercase">
                    Daily Calories Taken
                  </span>
                  <Flame className="h-4 w-4 text-amber-600" />
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="font-display text-2xl font-bold text-[#33281E]">
                    {dayTotals.calories}
                  </span>
                  <span className="text-xs text-[#8C7A6B]">/ {targetCalories} kcal</span>
                </div>
              </div>
              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5D9C5]/50">
                  <div
                    className="h-full rounded-full bg-amber-600 transition-all duration-500"
                    style={{ width: `${caloriesPercent}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] font-semibold">
                  <span className="text-[#8C7A6B]">{caloriesPercent}% filled</span>
                  <span className={caloriesRemaining >= 0 ? "text-emerald-800" : "text-red-700"}>
                    {caloriesRemaining >= 0
                      ? `${caloriesRemaining} kcal left`
                      : `${Math.abs(caloriesRemaining)} kcal over`}
                  </span>
                </div>
              </div>
            </div>

            {/* Protein Card */}
            <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-sky-800 uppercase">
                    Protein (Muscle Recovery)
                  </span>
                  <span className="text-xs font-bold text-sky-800">🥩</span>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="font-display text-2xl font-bold text-sky-950">
                    {dayTotals.protein}g
                  </span>
                  <span className="text-xs text-sky-700">/ {targetProtein}g</span>
                </div>
              </div>
              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-sky-200/60">
                  <div
                    className="h-full rounded-full bg-sky-600 transition-all duration-500"
                    style={{ width: `${proteinPercent}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] font-semibold text-sky-900">
                  <span>{proteinPercent}% target</span>
                  <span>{Math.max(0, targetProtein - dayTotals.protein)}g remaining</span>
                </div>
              </div>
            </div>

            {/* Carbs Card */}
            <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-amber-800 uppercase">
                    Carbs (Training Fuel)
                  </span>
                  <span className="text-xs font-bold text-amber-800">🌾</span>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="font-display text-2xl font-bold text-amber-950">
                    {dayTotals.carbs}g
                  </span>
                  <span className="text-xs text-amber-700">/ {targetCarbs}g</span>
                </div>
              </div>
              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-amber-200/60">
                  <div
                    className="h-full rounded-full bg-amber-600 transition-all duration-500"
                    style={{ width: `${carbsPercent}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] font-semibold text-amber-900">
                  <span>{carbsPercent}% target</span>
                  <span>{Math.max(0, targetCarbs - dayTotals.carbs)}g remaining</span>
                </div>
              </div>
            </div>

            {/* Fats Card */}
            <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-rose-800 uppercase">
                    Healthy Fats (Hormones)
                  </span>
                  <span className="text-xs font-bold text-rose-800">🥑</span>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="font-display text-2xl font-bold text-rose-950">
                    {dayTotals.fats}g
                  </span>
                  <span className="text-xs text-rose-700">/ {targetFats}g</span>
                </div>
              </div>
              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-rose-200/60">
                  <div
                    className="h-full rounded-full bg-rose-600 transition-all duration-500"
                    style={{ width: `${fatsPercent}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] font-semibold text-rose-900">
                  <span>{fatsPercent}% target</span>
                  <span>{Math.max(0, targetFats - dayTotals.fats)}g remaining</span>
                </div>
              </div>
            </div>
          </div>

          {/* Macro Ratio Distribution Breakdown */}
          <div className="rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#33281E]">
                Today&apos;s Caloric Macro Distribution
              </span>
              <span className="font-mono text-[11px] text-[#8C7A6B]">
                {totalMacroKcal} total logged kcal
              </span>
            </div>
            <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-[#E5D9C5]/40">
              <div
                style={{ width: `${proteinRatio}%` }}
                className="h-full bg-sky-500 transition-all"
                title={`Protein: ${proteinRatio}%`}
              />
              <div
                style={{ width: `${carbsRatio}%` }}
                className="h-full bg-amber-500 transition-all"
                title={`Carbs: ${carbsRatio}%`}
              />
              <div
                style={{ width: `${fatsRatio}%` }}
                className="h-full bg-rose-500 transition-all"
                title={`Fats: ${fatsRatio}%`}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                <span className="text-[#33281E]">Protein: {proteinRatio}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-[#33281E]">Carbohydrates: {carbsRatio}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span className="text-[#33281E]">Dietary Fats: {fatsRatio}%</span>
              </div>
            </div>
          </div>

          {/* Preset Quick Add Tray */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] font-bold text-[#8C7A6B] uppercase">
                1-Click Quick Add Presets
              </span>
              <span className="text-[11px] text-[#8C7A6B]">Click to log immediately</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_MEALS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddPreset(preset)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5D9C5] bg-white px-3 py-1.5 text-xs text-[#33281E] shadow-xs hover:border-[#8B5E34] hover:bg-[#FAF9F7] transition cursor-pointer"
                >
                  <Plus className="h-3 w-3 text-[#8B5E34]" />
                  <span className="font-semibold">{preset.name}</span>
                  <span className="font-mono text-[10px] text-[#8C7A6B]">
                    ({preset.calories} kcal)
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Add Custom Food Item Form */}
          <div className="rounded-2xl border border-[#E5D9C5] bg-white p-4 shadow-xs">
            <h4 className="font-display text-sm font-bold text-[#33281E] mb-3">
              Log Custom Food / Meal Item
            </h4>
            <form onSubmit={handleAddCustomFood} className="grid gap-3 sm:grid-cols-6 text-xs">
              <div className="sm:col-span-1">
                <label className="block font-mono text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">
                  Meal
                </label>
                <select
                  value={newMealType}
                  onChange={(e) => setNewMealType(e.target.value as FoodItem["mealType"])}
                  className="h-9 w-full rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] px-2 text-xs font-semibold text-[#33281E] outline-none focus:border-[#8B5E34]"
                >
                  <option value="Breakfast">Breakfast 🥞</option>
                  <option value="Lunch">Lunch 🥗</option>
                  <option value="Dinner">Dinner 🍲</option>
                  <option value="Snack">Snack 🍎</option>
                  <option value="Pre-Workout">Pre-Workout ⚡</option>
                  <option value="Post-Workout">Post-Workout 🥤</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-mono text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">
                  Food Item Name *
                </label>
                <input
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Soya Chunks Curry & Roti"
                  className="h-9 w-full rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] px-3 text-xs text-[#33281E] outline-none focus:border-[#8B5E34]"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block font-mono text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">
                  Calories (kcal) *
                </label>
                <input
                  required
                  type="number"
                  value={newCalories}
                  onChange={(e) => setNewCalories(e.target.value)}
                  placeholder="e.g. 350"
                  className="h-9 w-full rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] px-3 text-xs text-[#33281E] outline-none focus:border-[#8B5E34]"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block font-mono text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">
                  Protein (g)
                </label>
                <input
                  type="number"
                  value={newProtein}
                  onChange={(e) => setNewProtein(e.target.value)}
                  placeholder="e.g. 28"
                  className="h-9 w-full rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] px-3 text-xs text-[#33281E] outline-none focus:border-[#8B5E34]"
                />
              </div>

              <div className="sm:col-span-1 flex items-end">
                <Button
                  type="submit"
                  size="sm"
                  className="btn-primary w-full h-9 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Log Meal
                </Button>
              </div>
            </form>
          </div>

          {/* Today's Logged Items List */}
          <div>
            <div className="flex items-center justify-between border-b border-[#E5D9C5] pb-2 mb-3">
              <span className="font-display text-sm font-bold text-[#33281E]">
                Today&apos;s Intake Record ({foods.length} items)
              </span>
              <div className="flex items-center gap-2">
                {foods.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearDay}
                    className="text-xs text-red-600 hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSyncToGymCloud}
                  disabled={savingDailySync || foods.length === 0}
                  className="h-8 text-xs font-bold border-[#8B5E34] text-[#8B5E34] hover:bg-[#8B5E34] hover:text-white"
                >
                  {savingDailySync ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : syncSuccess ? (
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  <span>{syncSuccess ? "Synced to Cloud!" : "Save Day Log to Gym Cloud"}</span>
                </Button>
              </div>
            </div>

            {foods.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#E5D9C5] bg-[#F9F8F6] p-8 text-center">
                <Utensils className="mx-auto h-8 w-8 text-[#8C7A6B] mb-2" />
                <p className="font-bold text-sm text-[#33281E]">No meals logged for today yet</p>
                <p className="text-xs text-[#8C7A6B] mt-1 max-w-sm mx-auto">
                  Use the quick preset buttons above or enter your custom meals to analyze your caloric and macronutrient intake.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {foods.map((food) => (
                  <div
                    key={food.id}
                    className="flex items-center justify-between rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-3.5 transition hover:bg-[#F3EFEA]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="rounded-lg bg-white border border-[#E5D9C5] px-2 py-1 font-mono text-[10px] font-bold text-[#8B5E34]">
                        {food.mealType}
                      </span>
                      <div>
                        <p className="font-bold text-sm text-[#33281E]">{food.name}</p>
                        <p className="text-xs text-[#8C7A6B]">
                          {food.portion} • <span className="font-mono">{food.time}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="font-display font-bold text-sm text-[#33281E]">
                          {food.calories} kcal
                        </span>
                        <p className="font-mono text-[10px] text-[#8C7A6B]">
                          P: {food.protein}g | C: {food.carbs}g | F: {food.fats}g
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteFood(food.id)}
                        className="rounded-lg p-1.5 text-[#8C7A6B] hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: BMI & TARGET MACRO CALCULATOR */}
      {/* ======================================================== */}
      {activeTab === "bmi" && (
        <div className="grid gap-6 lg:grid-cols-2 animate-fade-up">
          {/* Left: Input Form */}
          <div className="rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-5 space-y-4">
            <h3 className="font-display text-base font-bold text-[#33281E] flex items-center gap-2">
              <Calculator className="h-4 w-4 text-[#8B5E34]" />
              Body Parameters & Fitness Goal
            </h3>

            <div className="grid gap-3.5 sm:grid-cols-2 text-xs">
              <div>
                <label className="block font-mono text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="h-10 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-sm font-bold text-[#33281E] outline-none focus:border-[#8B5E34]"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">
                  Current Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="h-10 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-sm font-bold text-[#33281E] outline-none focus:border-[#8B5E34]"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">
                  Age (Years)
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="h-10 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-sm font-bold text-[#33281E] outline-none focus:border-[#8B5E34]"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">
                  Biological Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as "male" | "female")}
                  className="h-10 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs font-bold text-[#33281E] outline-none focus:border-[#8B5E34]"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-mono text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">
                  Physical Activity Frequency
                </label>
                <select
                  value={activity}
                  onChange={(e) => setActivity(Number(e.target.value))}
                  className="h-10 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs font-medium text-[#33281E] outline-none focus:border-[#8B5E34]"
                >
                  <option value={1.2}>Sedentary (Desk job, little to no workout)</option>
                  <option value={1.375}>Lightly Active (1-3 gym workouts/week)</option>
                  <option value={1.55}>Moderately Active (3-5 intense gym sessions/week)</option>
                  <option value={1.725}>Very Active (6-7 intense sessions/week)</option>
                  <option value={1.9}>Heavy Training / Competitive Athlete (2x per day)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-mono text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">
                  Primary Fitness Goal
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "cut", label: "Fat Loss (Cut)", desc: "-450 kcal deficit" },
                    { id: "maintain", label: "Maintenance", desc: "Energy balance" },
                    { id: "bulk", label: "Muscle Gain (Bulk)", desc: "+350 kcal surplus" },
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGoal(g.id as "cut" | "maintain" | "bulk")}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition cursor-pointer ${
                        goal === g.id
                          ? "border-[#8B5E34] bg-[#8B5E34] text-white shadow-xs"
                          : "border-[#E5D9C5] bg-white text-[#33281E] hover:bg-[#FAF9F7]"
                      }`}
                    >
                      <span className="font-bold text-xs">{g.label}</span>
                      <span className="text-[10px] opacity-80 mt-0.5">{g.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleSaveMetrics}
              disabled={savingMetrics}
              className="btn-primary w-full h-10 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer mt-2"
            >
              {savingMetrics ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : metricSuccess ? (
                <CheckCircle2 className="mr-1.5 h-4 w-4 text-emerald-400" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              <span>{metricSuccess ? "Saved to Profile!" : "Save BMI Checkpoint to My Profile"}</span>
            </Button>
          </div>

          {/* Right: Results & Target Macro Engine */}
          <div className="space-y-4">
            {/* BMI Result Gauge */}
            <div className="rounded-2xl border border-[#E5D9C5] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-[#8C7A6B] uppercase">
                  Body Mass Index (BMI)
                </span>
                <Badge className={`px-2.5 py-0.5 text-xs font-bold ${bmiCategory.color}`}>
                  {bmiCategory.label}
                </Badge>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-4xl font-bold text-[#33281E]">
                  {bmi}
                </span>
                <span className="text-xs text-[#8C7A6B]">kg/m²</span>
              </div>

              {/* BMI Bar Gauge */}
              <div className="mt-3">
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-gradient-to-r from-sky-400 via-emerald-500 via-amber-400 to-red-500">
                  <div
                    className="absolute top-0 bottom-0 w-2.5 bg-black rounded-full shadow-md border-2 border-white transition-all duration-300 -translate-x-1/2"
                    style={{
                      left: `${Math.max(5, Math.min(95, ((bmi - 15) / (35 - 15)) * 100))}%`,
                    }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[10px] font-mono text-[#8C7A6B]">
                  <span>Underweight (&lt;18.5)</span>
                  <span>Normal (18.5-24.9)</span>
                  <span>Overweight (25-30)</span>
                  <span>Obese (30+)</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between pt-3 border-t border-[#E5D9C5] text-xs">
                <span className="text-[#8C7A6B]">Ideal Healthy Weight for your height:</span>
                <span className="font-bold text-[#33281E]">{idealWeightRange}</span>
              </div>
            </div>

            {/* Target Nutrition & Energy Calculation */}
            <div className="rounded-2xl border border-[#E5D9C5] bg-[#FAF8F5] p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#E5D9C5] pb-2.5">
                <h4 className="font-display text-sm font-bold text-[#33281E]">
                  Personalized Energy & Macro Targets
                </h4>
                <Badge variant="outline" className="font-mono text-[10px] border-[#8B5E34] text-[#8B5E34]">
                  {goal.toUpperCase()} PROTOCOL
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-[#E5D9C5] bg-white p-3">
                  <p className="text-[10px] font-mono text-[#8C7A6B] uppercase font-bold">
                    Basal Metabolic Rate (BMR)
                  </p>
                  <p className="font-display text-lg font-bold text-[#33281E] mt-0.5">
                    {bmr} <span className="text-xs font-normal text-[#8C7A6B]">kcal/day</span>
                  </p>
                  <p className="text-[10px] text-[#8C7A6B] mt-0.5">Calories burned at complete rest</p>
                </div>

                <div className="rounded-xl border border-[#E5D9C5] bg-white p-3">
                  <p className="text-[10px] font-mono text-[#8C7A6B] uppercase font-bold">
                    TDEE (Daily Expenditure)
                  </p>
                  <p className="font-display text-lg font-bold text-[#8B5E34] mt-0.5">
                    {tdee} <span className="text-xs font-normal text-[#8C7A6B]">kcal/day</span>
                  </p>
                  <p className="text-[10px] text-[#8C7A6B] mt-0.5">Maintenance energy expenditure</p>
                </div>
              </div>

              {/* Target Macros Breakdown */}
              <div className="rounded-xl border border-[#E5D9C5] bg-white p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#33281E]">Recommended Daily Intake</span>
                  <span className="font-display font-bold text-base text-[#8B5E34]">
                    {targetCalories} kcal
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E5D9C5] text-center">
                  <div className="rounded-lg bg-sky-50 p-2">
                    <p className="font-mono text-[10px] font-bold text-sky-800 uppercase">Protein</p>
                    <p className="font-display text-base font-bold text-sky-950 mt-0.5">
                      {targetProtein}g
                    </p>
                    <p className="text-[9px] text-sky-700">~{targetProtein * 4} kcal</p>
                  </div>

                  <div className="rounded-lg bg-amber-50 p-2">
                    <p className="font-mono text-[10px] font-bold text-amber-800 uppercase">Carbs</p>
                    <p className="font-display text-base font-bold text-amber-950 mt-0.5">
                      {targetCarbs}g
                    </p>
                    <p className="text-[9px] text-amber-700">~{targetCarbs * 4} kcal</p>
                  </div>

                  <div className="rounded-lg bg-rose-50 p-2">
                    <p className="font-mono text-[10px] font-bold text-rose-800 uppercase">Fats</p>
                    <p className="font-display text-base font-bold text-rose-950 mt-0.5">
                      {targetFats}g
                    </p>
                    <p className="text-[9px] text-rose-700">~{targetFats * 9} kcal</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
