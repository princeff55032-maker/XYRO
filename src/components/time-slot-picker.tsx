"use client";

import { useState, useEffect } from "react";
import { Clock, ArrowRight, Sparkles } from "lucide-react";

interface CustomTimeSlotPickerProps {
  value: string;
  onChange: (value: string) => void;
}

// Convert 24-hour "HH:mm" to 12-hour "hh:mm AM/PM"
function to12Hour(time24: string): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  if (isNaN(h)) return "";
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  const hDisplay = h < 10 ? `0${h}` : `${h}`;
  return `${hDisplay}:${m} ${period}`;
}

// Convert 12-hour "hh:mm AM/PM" to 24-hour "HH:mm"
function to24Hour(time12: string): string {
  if (!time12) return "";
  const clean = time12.trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return "";
  let h = parseInt(match[1], 10);
  const m = match[2];
  const period = match[3]?.toUpperCase();

  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;

  const hStr = h < 10 ? `0${h}` : `${h}`;
  return `${hStr}:${m}`;
}

// Parse existing value string like "05:30 AM - 07:00 AM" or "05:30"
function parseInitialSlot(val: string): { start: string; end: string } {
  if (!val) return { start: "06:00", end: "07:30" };
  const parts = val.split(/[-–—to]+/i).map((s) => s.trim());
  if (parts.length >= 2) {
    const s24 = to24Hour(parts[0]);
    const e24 = to24Hour(parts[1]);
    return {
      start: s24 || (parts[0].includes(":") ? parts[0] : "06:00"),
      end: e24 || (parts[1].includes(":") ? parts[1] : "07:30"),
    };
  }
  if (parts.length === 1 && parts[0]) {
    const s24 = to24Hour(parts[0]);
    return {
      start: s24 || (parts[0].includes(":") ? parts[0] : "06:00"),
      end: "07:30",
    };
  }
  return { start: "06:00", end: "07:30" };
}

export function CustomTimeSlotPicker({ value, onChange }: CustomTimeSlotPickerProps) {
  const initial = parseInitialSlot(value);
  const [startTime, setStartTime] = useState(initial.start);
  const [endTime, setEndTime] = useState(initial.end);

  useEffect(() => {
    if (startTime && endTime) {
      const formatted = `${to12Hour(startTime)} - ${to12Hour(endTime)}`;
      if (formatted !== value) {
        onChange(formatted);
      }
    }
  }, [startTime, endTime]); // eslint-disable-line react-hooks/exhaustive-deps

  // Quick preset duration adder
  const addDurationMinutes = (minutes: number) => {
    if (!startTime) return;
    const [hStr, mStr] = startTime.split(":");
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(h) || isNaN(m)) return;

    let totalMinutes = h * 60 + m + minutes;
    // Wrap around 24 hours
    totalMinutes = totalMinutes % (24 * 60);

    const newH = Math.floor(totalMinutes / 60);
    const newM = totalMinutes % 60;

    const newHStr = newH < 10 ? `0${newH}` : `${newH}`;
    const newMStr = newM < 10 ? `0${newM}` : `${newM}`;

    setEndTime(`${newHStr}:${newMStr}`);
  };

  const formattedPreview =
    startTime && endTime ? `${to12Hour(startTime)} - ${to12Hour(endTime)}` : "";

  return (
    <div className="mt-2.5 rounded-2xl border border-[#E5D9C5] bg-[#FDFBF9] p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold text-[#33281E]">
        <span className="flex items-center gap-1.5 text-[#8B5E34]">
          <Clock className="h-4 w-4" />
          <span>Clock Time Selection</span>
        </span>
        {formattedPreview && (
          <span className="rounded-md border border-[#E5D9C5] bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-[#8B5E34]">
            {formattedPreview}
          </span>
        )}
      </div>

      {/* Two Clock Inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[10px] font-mono font-bold uppercase tracking-wider text-[#8C7A6B]">
            Start Time (From)
          </label>
          <div className="relative">
            <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C7A6B]" />
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#E5D9C5] bg-white pl-9 pr-2 text-xs font-semibold text-[#33281E] outline-none transition focus:border-[#8B5E34] focus:ring-2 focus:ring-[#8B5E34]/15 cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-mono font-bold uppercase tracking-wider text-[#8C7A6B]">
            End Time (To)
          </label>
          <div className="relative">
            <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C7A6B]" />
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#E5D9C5] bg-white pl-9 pr-2 text-xs font-semibold text-[#33281E] outline-none transition focus:border-[#8B5E34] focus:ring-2 focus:ring-[#8B5E34]/15 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Quick Duration Preset Chips */}
      <div className="flex items-center gap-1.5 pt-1">
        <span className="text-[10px] font-mono text-[#8C7A6B] uppercase tracking-wider mr-1">
          Quick Duration:
        </span>
        <button
          type="button"
          onClick={() => addDurationMinutes(60)}
          className="rounded-lg border border-[#E5D9C5] bg-white px-2 py-1 text-[10px] font-semibold text-[#33281E] hover:border-[#8B5E34] hover:bg-[#FAF9F7] transition cursor-pointer"
        >
          +1 hr
        </button>
        <button
          type="button"
          onClick={() => addDurationMinutes(90)}
          className="rounded-lg border border-[#E5D9C5] bg-white px-2 py-1 text-[10px] font-semibold text-[#33281E] hover:border-[#8B5E34] hover:bg-[#FAF9F7] transition cursor-pointer"
        >
          +1.5 hrs
        </button>
        <button
          type="button"
          onClick={() => addDurationMinutes(120)}
          className="rounded-lg border border-[#E5D9C5] bg-white px-2 py-1 text-[10px] font-semibold text-[#33281E] hover:border-[#8B5E34] hover:bg-[#FAF9F7] transition cursor-pointer"
        >
          +2 hrs
        </button>
      </div>
    </div>
  );
}
