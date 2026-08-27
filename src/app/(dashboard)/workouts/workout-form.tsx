"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Dumbbell, Salad } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addWorkoutPlanAction, addDietPlanAction } from "../actions";

const workoutHelp = `Format — one exercise per line:
DAY | Exercise | Sets | Reps | Weight

MON | Bench Press | 4 | 8-12 | 60kg
MON | Incline Dumbbell | 3 | 10 | 22.5kg
TUE | Barbell Squat | 4 | 6-8 | 80kg`;

const dietHelp = `Format — one meal per line:
MEAL | Time | Food items | Calories

BREAKFAST | 08:00 | Oats, Milk, Banana | 450
LUNCH | 13:00 | Rice, Dal, Chicken | 650
DINNER | 20:00 | Paneer, Roti, Salad | 550`;

function usePlanForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  return {
    open, setOpen, error, setError, loading, setLoading,
    memberId, setMemberId, name, setName, description, setDescription, body, setBody,
  };
}

const fieldCls =
  "h-10 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none transition-colors focus:border-[#8B5E34] focus:ring-2 focus:ring-[#8B5E34]/15";
const areaCls =
  "w-full rounded-xl border border-[#E5D9C5] bg-white px-3 py-2 font-mono text-xs leading-relaxed text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none transition-colors focus:border-[#8B5E34]";

export function AddWorkoutDialog({ members }: { members: { id: string; label: string }[] }) {
  const router = useRouter();
  const f = usePlanForm();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.memberId) return f.setError("Select a member");
    f.setError(null);
    f.setLoading(true);
    const res = await addWorkoutPlanAction({
      memberId: f.memberId,
      name: f.name,
      description: f.description || undefined,
      exercises: f.body,
    });
    f.setLoading(false);
    if (!res.ok) return f.setError(res.error ?? "Failed to create plan");
    f.setOpen(false);
    f.setMemberId(""); f.setName(""); f.setDescription(""); f.setBody("");
    router.refresh();
  }

  return (
    <Dialog open={f.open} onOpenChange={f.setOpen}>
      <DialogTrigger asChild>
        <Button className="h-9.5 rounded-xl btn-primary">
          <Plus className="h-4 w-4 text-white" />
          Workout Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-4.5 w-4.5 text-[#8B5E34]" />
            Author Workout Split
          </DialogTitle>
          <DialogDescription>Assign a structured progressive overload protocol to a member.</DialogDescription>
        </DialogHeader>
        {f.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 font-mono font-medium">{f.error}</div>
        )}
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">Member *</label>
              <Select value={f.memberId || undefined} onValueChange={f.setMemberId}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">Plan Name *</label>
              <input required value={f.name} onChange={(e) => f.setName(e.target.value)} placeholder="Hypertrophy — Phase 1" className={fieldCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">Description</label>
              <input value={f.description} onChange={(e) => f.setDescription(e.target.value)} placeholder="8-week strength block targeting compound movements" className={fieldCls} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">Exercise Matrix</label>
            <textarea required rows={6} value={f.body} onChange={(e) => f.setBody(e.target.value)} placeholder={workoutHelp} className={areaCls} />
            <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-[#8C7A6B]">
              DAY | Exercise | Sets | Reps | Weight — one exercise per line
            </p>
          </div>
          <Button type="submit" disabled={f.loading} className="btn-primary h-10 rounded-xl text-white font-bold">
            {f.loading && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            {f.loading ? "Saving plan…" : "Save Workout Protocol"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddDietDialog({ members }: { members: { id: string; label: string }[] }) {
  const router = useRouter();
  const f = usePlanForm();
  const [calories, setCalories] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.memberId) return f.setError("Select a member");
    f.setError(null);
    f.setLoading(true);
    const res = await addDietPlanAction({
      memberId: f.memberId,
      name: f.name,
      description: f.description || undefined,
      totalCalories: calories || undefined,
      meals: f.body,
    });
    f.setLoading(false);
    if (!res.ok) return f.setError(res.error ?? "Failed to create plan");
    f.setOpen(false);
    f.setMemberId(""); f.setName(""); f.setDescription(""); f.setBody("");
    setCalories("");
    router.refresh();
  }

  return (
    <Dialog open={f.open} onOpenChange={f.setOpen}>
      <DialogTrigger asChild>
        <Button className="h-9.5 rounded-xl btn-primary">
          <Plus className="h-4 w-4 text-white" />
          Diet Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Salad className="h-4.5 w-4.5 text-[#8B5E34]" />
            Author Nutrition Engine
          </DialogTitle>
          <DialogDescription>Assign a calorie-targeted macronutrient meal matrix to a member.</DialogDescription>
        </DialogHeader>
        {f.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 font-mono font-medium">{f.error}</div>
        )}
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">Member *</label>
              <Select value={f.memberId || undefined} onValueChange={f.setMemberId}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">Plan Name *</label>
              <input required value={f.name} onChange={(e) => f.setName(e.target.value)} placeholder="Lean Mass Matrix" className={fieldCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">Daily Calories</label>
              <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="2400" className={fieldCls} />
            </div>
            <div className="sm:col-span-3">
              <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">Description</label>
              <input value={f.description} onChange={(e) => f.setDescription(e.target.value)} placeholder="High protein, moderate carbs, anti-inflammatory whole foods" className={fieldCls} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">Daily Meal Protocol</label>
            <textarea required rows={6} value={f.body} onChange={(e) => f.setBody(e.target.value)} placeholder={dietHelp} className={areaCls} />
            <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-[#8C7A6B]">
              MEAL | Time | Food items | Calories — one meal per line
            </p>
          </div>
          <Button type="submit" disabled={f.loading} className="btn-primary h-10 rounded-xl text-white font-bold">
            {f.loading && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            {f.loading ? "Saving plan…" : "Save Nutrition Protocol"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
