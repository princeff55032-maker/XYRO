"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Scale,
  Activity,
  Plus,
  Trash2,
  Calendar,
  Droplets,
  Flame,
  CheckCircle2,
  Loader2,
  X,
  Sparkles,
  HeartPulse,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { logMemberDailyProgressAction, deleteMemberProgressRecordAction } from "./actions";

export interface ProgressRecordItem {
  id: string;
  date: Date;
  weight: number | null;
  height: number | null;
  bodyFat: number | null;
  chest: number | null;
  waist: number | null;
  arms: number | null;
  thighs: number | null;
  bmi: number | null;
  calories: number | null;
  waterLiters: number | null;
  notes: string | null;
}

export function DailyProgressTracker({
  records = [],
  memberHeight = 175,
}: {
  records: ProgressRecordItem[];
  memberHeight?: number;
}) {
  const router = useRouter();
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    weight: "",
    height: memberHeight ? String(memberHeight) : "175",
    bodyFat: "",
    chest: "",
    waist: "",
    arms: "",
    thighs: "",
    calories: "",
    waterLiters: "",
    notes: "",
  });

  const latest = records[0];
  const previous = records[1];
  const weightDiff =
    latest?.weight && previous?.weight ? (latest.weight - previous.weight).toFixed(1) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await logMemberDailyProgressAction({
      weight: form.weight ? parseFloat(form.weight) : undefined,
      height: form.height ? parseFloat(form.height) : undefined,
      bodyFat: form.bodyFat ? parseFloat(form.bodyFat) : undefined,
      chest: form.chest ? parseFloat(form.chest) : undefined,
      waist: form.waist ? parseFloat(form.waist) : undefined,
      arms: form.arms ? parseFloat(form.arms) : undefined,
      thighs: form.thighs ? parseFloat(form.thighs) : undefined,
      calories: form.calories ? parseInt(form.calories) : undefined,
      waterLiters: form.waterLiters ? parseFloat(form.waterLiters) : undefined,
      notes: form.notes || undefined,
    });

    setLoading(false);
    if (!res.ok) {
      setError(res.error || "Failed to save daily progress record.");
      return;
    }

    setOpenDialog(false);
    setForm({
      weight: "",
      height: memberHeight ? String(memberHeight) : "175",
      bodyFat: "",
      chest: "",
      waist: "",
      arms: "",
      thighs: "",
      calories: "",
      waterLiters: "",
      notes: "",
    });
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteMemberProgressRecordAction(id);
    setDeletingId(null);
    router.refresh();
  };

  const inputCls =
    "h-9 w-full rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] px-3 text-xs text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none focus:border-[#8B5E34] focus:bg-white transition";

  return (
    <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 md:p-8 shadow-[0_4px_20px_rgba(51,40,30,0.03)] space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5D9C5] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-[#33281E]">
              Daily Progress &amp; Body Metrics
            </h3>
            <p className="text-xs text-[#8C7A6B]">
              Track your daily weigh-ins, body circumference, and hydration logs.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => {
            setError(null);
            setOpenDialog(true);
          }}
          className="btn-primary inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-bold text-white cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Log Today&apos;s Metrics</span>
        </Button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Latest Weight Card */}
        <div className="rounded-2xl border border-[#E5D9C5] bg-[#FAF9F7] p-4">
          <div className="flex items-center justify-between text-xs text-[#8C7A6B] font-mono font-bold uppercase">
            <span>Body Weight</span>
            <Scale className="h-4 w-4 text-[#8B5E34]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-[#33281E]">
              {latest?.weight ? `${latest.weight} kg` : "—"}
            </span>
            {weightDiff !== null && (
              <span
                className={`text-xs font-mono font-bold ${
                  parseFloat(weightDiff) <= 0 ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {parseFloat(weightDiff) > 0 ? `+${weightDiff}` : weightDiff} kg
              </span>
            )}
          </div>
          <p className="text-[10px] text-[#8C7A6B] mt-1">
            {latest ? `Recorded on ${new Date(latest.date).toLocaleDateString()}` : "No entries logged yet"}
          </p>
        </div>

        {/* Body Fat / BMI */}
        <div className="rounded-2xl border border-[#E5D9C5] bg-[#FAF9F7] p-4">
          <div className="flex items-center justify-between text-xs text-[#8C7A6B] font-mono font-bold uppercase">
            <span>Body Fat &amp; BMI</span>
            <Activity className="h-4 w-4 text-sky-700" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-[#33281E]">
              {latest?.bodyFat ? `${latest.bodyFat}%` : latest?.bmi ? `BMI ${latest.bmi}` : "—"}
            </span>
            {latest?.bmi && latest.bodyFat && (
              <span className="text-xs font-mono font-semibold text-[#8C7A6B]">
                BMI {latest.bmi}
              </span>
            )}
          </div>
          <p className="text-[10px] text-[#8C7A6B] mt-1">Estimated composition index</p>
        </div>

        {/* Measurements */}
        <div className="rounded-2xl border border-[#E5D9C5] bg-[#FAF9F7] p-4">
          <div className="flex items-center justify-between text-xs text-[#8C7A6B] font-mono font-bold uppercase">
            <span>Chest / Waist / Arms</span>
            <TrendingUp className="h-4 w-4 text-amber-700" />
          </div>
          <div className="mt-2 text-xs text-[#33281E] font-mono space-y-0.5">
            <div>
              Chest: <strong>{latest?.chest ? `${latest.chest} cm` : "—"}</strong>
            </div>
            <div>
              Waist: <strong>{latest?.waist ? `${latest.waist} cm` : "—"}</strong> | Arms:{" "}
              <strong>{latest?.arms ? `${latest.arms} cm` : "—"}</strong>
            </div>
          </div>
        </div>

        {/* Hydration & Calories */}
        <div className="rounded-2xl border border-[#E5D9C5] bg-[#FAF9F7] p-4">
          <div className="flex items-center justify-between text-xs text-[#8C7A6B] font-mono font-bold uppercase">
            <span>Hydration &amp; Output</span>
            <Droplets className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-[#33281E]">
              {latest?.waterLiters ? `${latest.waterLiters}L` : "—"}
            </span>
            {latest?.calories && (
              <span className="text-xs font-mono font-bold text-amber-800">
                🔥 {latest.calories} kcal
              </span>
            )}
          </div>
          <p className="text-[10px] text-[#8C7A6B] mt-1">Daily active lifestyle tracking</p>
        </div>
      </div>

      {/* Progress History List */}
      <div className="space-y-3">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#8C7A6B]">
          Recent Progress History ({records.length})
        </h4>

        {records.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E5D9C5] p-6 text-center text-xs text-[#8C7A6B]">
            No progress entries recorded yet. Click &quot;Log Today&apos;s Metrics&quot; to begin your fitness tracking!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E5D9C5] bg-[#FAF9F7] text-left text-[10px] font-mono font-bold uppercase text-[#8C7A6B]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Weight</th>
                  <th className="py-2.5 px-3">Body Fat</th>
                  <th className="py-2.5 px-3">Measurements</th>
                  <th className="py-2.5 px-3">Water</th>
                  <th className="py-2.5 px-3">Notes</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5D9C5]">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-[#FAF9F7]/60 transition">
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#33281E]">
                      {new Date(r.date).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#8B5E34]">
                      {r.weight ? `${r.weight} kg` : "—"}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {r.bodyFat ? `${r.bodyFat}%` : r.bmi ? `BMI ${r.bmi}` : "—"}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#8C7A6B]">
                      {r.chest ? `C:${r.chest} ` : ""}
                      {r.waist ? `W:${r.waist} ` : ""}
                      {r.arms ? `A:${r.arms}` : ""}
                      {!r.chest && !r.waist && !r.arms && "—"}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {r.waterLiters ? `${r.waterLiters} L` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-[#33281E] max-w-xs truncate">
                      {r.notes || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        disabled={deletingId === r.id}
                        className="text-[#8C7A6B] hover:text-red-700 transition cursor-pointer p-1"
                        title="Delete record"
                      >
                        {deletingId === r.id ? (
                          <Loader2 className="h-3 w-3 animate-spin text-red-700" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Progress Modal */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-left">
              <Sparkles className="h-5 w-5 text-[#8B5E34]" />
              Log Daily Progress
            </DialogTitle>
            <DialogDescription className="text-left">
              Record your body weight, circumference measurements, and daily notes.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                  Weight (kg) *
                </label>
                <input
                  required
                  type="number"
                  step="0.1"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  placeholder="e.g. 74.5"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                  Height (cm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={form.height}
                  onChange={(e) => setForm({ ...form, height: e.target.value })}
                  placeholder="e.g. 178"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                  Body Fat (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.bodyFat}
                  onChange={(e) => setForm({ ...form, bodyFat: e.target.value })}
                  placeholder="e.g. 14.5"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                  Water Intake (L)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.waterLiters}
                  onChange={(e) => setForm({ ...form, waterLiters: e.target.value })}
                  placeholder="e.g. 3.5"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Circumference Measurements */}
            <div className="rounded-2xl border border-[#E5D9C5] bg-[#FAF9F7] p-3 space-y-2.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8C7A6B]">
                Body Measurements (cm) — Optional
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-[#8C7A6B]">Chest</label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.chest}
                    onChange={(e) => setForm({ ...form, chest: e.target.value })}
                    placeholder="cm"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8C7A6B]">Waist</label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.waist}
                    onChange={(e) => setForm({ ...form, waist: e.target.value })}
                    placeholder="cm"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8C7A6B]">Arms</label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.arms}
                    onChange={(e) => setForm({ ...form, arms: e.target.value })}
                    placeholder="cm"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                Workout &amp; Energy Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Personal records, energy levels, diet adherence, or recovery notes"
                rows={2}
                className="w-full rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] p-2 text-xs text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none focus:border-[#8B5E34] focus:bg-white transition"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenDialog(false)}
                className="rounded-xl border-[#E5D9C5] text-[#33281E]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="btn-primary rounded-xl text-white font-bold"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                Save Progress
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
