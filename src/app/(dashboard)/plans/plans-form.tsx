"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, BadgePercent } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { addPlanAction } from "../actions";

export function AddPlanDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    durationDays: "30",
    price: "",
    features: "",
    freezeDays: "0",
    classesIncluded: false,
    personalTraining: false,
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await addPlanAction(form);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "Failed to create plan");
      return;
    }
    setOpen(false);
    setForm({ name: "", description: "", durationDays: "30", price: "", features: "", freezeDays: "0", classesIncluded: false, personalTraining: false });
    router.refresh();
  }

  const inputCls =
    "h-10 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none transition-colors focus:border-[#8B5E34] focus:ring-2 focus:ring-[#8B5E34]/15";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-9.5 rounded-xl btn-primary">
          <Plus className="h-4 w-4 text-white" />
          New Plan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgePercent className="h-4.5 w-4.5 text-[#8B5E34]" />
            Create Membership Plan
          </DialogTitle>
          <DialogDescription>
            Athletes can be assigned this tier on signup, upgrades, or automated WhatsApp renewal.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 font-medium font-mono">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">Plan Name *</label>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Monthly Performance Pass" className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">Duration (days) *</label>
              <input required type="number" min={1} value={form.durationDays} onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">Price (₹) *</label>
              <input required type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="2499" className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">Freeze Days</label>
              <input type="number" min={0} value={form.freezeDays} onChange={(e) => setForm((f) => ({ ...f, freezeDays: e.target.value }))} className={inputCls} />
            </div>
            <div className="flex items-end gap-5 pb-1.5">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#33281E]">
                <input type="checkbox" checked={form.classesIncluded} onChange={(e) => setForm((f) => ({ ...f, classesIncluded: e.target.checked }))} className="h-4 w-4 accent-[#8B5E34] rounded" />
                Classes included
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#33281E]">
                <input type="checkbox" checked={form.personalTraining} onChange={(e) => setForm((f) => ({ ...f, personalTraining: e.target.checked }))} className="h-4 w-4 accent-[#8B5E34] rounded" />
                Personal training
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">Features <span className="text-[#8C7A6B] font-normal">(comma separated)</span></label>
              <input value={form.features} onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))} placeholder="Sub-second turnstile, Locker, Progressive overload tracker" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">Description</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Full facility floor access with recovery zone and 2 guest passes" className="w-full rounded-xl border border-[#E5D9C5] bg-white px-3 py-2 text-xs text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none transition-colors focus:border-[#8B5E34]" />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="mt-1 btn-primary h-10 rounded-xl text-white font-bold">
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            {loading ? "Creating plan…" : "Create plan"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
