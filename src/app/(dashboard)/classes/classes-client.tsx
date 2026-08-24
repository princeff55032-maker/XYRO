"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  UserCheck,
  Flame,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addClassAction, deleteClassAction } from "../actions";

interface ClassItem {
  id: string;
  name: string;
  description: string | null;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  isActive: boolean;
  trainer: { user: { name: string } } | null;
  _count: { bookings: number };
}

interface TrainerOption {
  id: string;
  name: string;
}

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export function ClassesClient({
  classes,
  trainers,
}: {
  classes: ClassItem[];
  trainers: TrainerOption[];
}) {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    dayOfWeek: "MON",
    startTime: "07:00",
    endTime: "08:00",
    maxCapacity: 20,
    trainerId: "",
  });

  const filteredClasses =
    selectedDay === "ALL"
      ? classes
      : classes.filter((c) => c.dayOfWeek === selectedDay);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await addClassAction({
      ...formData,
      trainerId: formData.trainerId || undefined,
    });

    setLoading(false);
    if (!res.ok) {
      setError(res.error || "Failed to create class");
    } else {
      setShowAddModal(false);
      setFormData({
        name: "",
        description: "",
        dayOfWeek: "MON",
        startTime: "07:00",
        endTime: "08:00",
        maxCapacity: 20,
        trainerId: "",
      });
      router.refresh();
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm("Are you sure you want to remove this class schedule?")) return;
    setDeleteLoadingId(id);
    await deleteClassAction(id);
    setDeleteLoadingId(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Day Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5D9C5] pb-4">
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-[#E5D9C5] bg-[#F3EFEA] p-1.5">
          <button
            onClick={() => setSelectedDay("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer font-mono ${
              selectedDay === "ALL"
                ? "bg-[#8B5E34] text-white shadow-xs"
                : "text-[#8C7A6B] hover:text-[#33281E]"
            }`}
          >
            All Days
          </button>
          {DAYS.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer font-mono ${
                selectedDay === d
                  ? "bg-[#8B5E34] text-white shadow-xs"
                  : "text-[#8C7A6B] hover:text-[#33281E]"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Add Class Button */}
        <Button
          onClick={() => setShowAddModal(true)}
          className="btn-primary inline-flex items-center gap-2 h-10 px-5 text-xs text-white font-bold shadow-sm cursor-pointer rounded-xl"
        >
          <Plus className="h-4 w-4" />
          Schedule New Session
        </Button>
      </div>

      {/* Classes Grid */}
      {filteredClasses.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-[#E5D9C5] bg-white py-20 text-center shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F9F8F6] border border-[#E5D9C5] text-[#8B5E34] shadow-xs">
            <Flame className="h-7 w-7" />
          </div>
          <h3 className="font-display text-lg font-bold text-[#33281E]">No classes scheduled</h3>
          <p className="max-w-sm text-xs text-[#8C7A6B]">
            Create high-energy group fitness classes like CrossFit, Zumba, Yoga, and HIIT slots for your members.
          </p>
          <Button
            onClick={() => setShowAddModal(true)}
            className="btn-primary mt-2 h-9 px-4 text-xs text-white font-bold rounded-xl"
          >
            Create First Class
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClasses.map((c) => {
            const booked = c._count.bookings;
            const cap = c.maxCapacity;
            const percent = Math.min(100, Math.round((booked / cap) * 100));

            return (
              <div
                key={c.id}
                className="flex flex-col justify-between rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-[0_4px_20px_rgba(51,40,30,0.03)] transition-all duration-300 hover:border-[#8B5E34] hover:shadow-[0_8px_24px_rgba(51,40,30,0.08)]"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge variant="default" className="text-[10px] font-mono font-bold">
                        {c.dayOfWeek}
                      </Badge>
                      <h3 className="mt-2 font-display text-base font-bold text-[#33281E]">{c.name}</h3>
                    </div>

                    <button
                      onClick={() => handleDeleteClass(c.id)}
                      disabled={deleteLoadingId === c.id}
                      className="text-[#8C7A6B] hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer p-1.5"
                      title="Delete class"
                    >
                      {deleteLoadingId === c.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {c.description && (
                    <p className="mt-2 text-xs leading-relaxed text-[#8C7A6B] line-clamp-2">
                      {c.description}
                    </p>
                  )}

                  {/* Time & Trainer */}
                  <div className="mt-4 space-y-2 text-xs text-[#33281E]">
                    <div className="flex items-center gap-2 font-mono font-bold text-[#8B5E34]">
                      <Clock className="h-3.5 w-3.5 text-[#8B5E34]" />
                      <span>
                        {c.startTime} – {c.endTime}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-medium text-[#8C7A6B]">
                      <UserCheck className="h-3.5 w-3.5 text-[#8C7A6B]" />
                      <span>Coach: {c.trainer?.user.name || "Open Floor"}</span>
                    </div>
                  </div>
                </div>

                {/* Capacity Progress */}
                <div className="mt-6 border-t border-[#E5D9C5] pt-4">
                  <div className="flex justify-between text-xs mb-2 font-mono">
                    <span className="text-[#8C7A6B] text-[11px]">Class Occupancy</span>
                    <span className="font-bold text-[#33281E] text-[11px]">
                      {booked} / {cap} booked
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#F3EFEA]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        percent >= 90
                          ? "bg-red-500"
                          : percent >= 60
                          ? "bg-amber-500"
                          : "bg-emerald-600"
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Class Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#33281E]/40 backdrop-blur-sm animate-fade-up">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-2xl">
            <h3 className="font-display text-lg font-bold text-[#33281E]">Schedule New Group Class</h3>
            <p className="mt-1 text-xs text-[#8C7A6B]">
              Add recurring workout slots and assign coaching staff.
            </p>

            {error && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleAddClass} className="mt-4 space-y-3.5">
              <div>
                <label className="text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                  Class Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Sunrise CrossFit, HIIT Blast, Power Yoga"
                  className="mt-1 h-10 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] outline-none focus:border-[#8B5E34]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                    Day of Week
                  </label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                    className="mt-1 h-10 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] outline-none focus:border-[#8B5E34]"
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                    Max Capacity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={formData.maxCapacity}
                    onChange={(e) =>
                      setFormData({ ...formData, maxCapacity: Number(e.target.value) })
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] outline-none focus:border-[#8B5E34] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="mt-1 h-10 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] outline-none focus:border-[#8B5E34] font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="mt-1 h-10 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] outline-none focus:border-[#8B5E34] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                  Assigned Coach / Trainer
                </label>
                <select
                  value={formData.trainerId}
                  onChange={(e) => setFormData({ ...formData, trainerId: e.target.value })}
                  className="mt-1 h-10 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] outline-none focus:border-[#8B5E34]"
                >
                  <option value="">Select Trainer (Optional)</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                  Description / Gear Required
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Bring water and sweat towel. High-intensity cardio."
                  className="mt-1 w-full rounded-xl border border-[#E5D9C5] bg-white p-2.5 text-xs text-[#33281E] outline-none focus:border-[#8B5E34]"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-10 px-4 text-xs text-[#8C7A6B] hover:text-[#33281E] transition cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="btn-primary h-10 px-5 text-xs text-white font-bold shadow-sm rounded-xl"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : "Save Class"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
