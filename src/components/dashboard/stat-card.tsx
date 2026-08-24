import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  className,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[#E5D9C5] bg-white p-5 shadow-[0_4px_20px_rgba(51,40,30,0.03)] transition-all duration-300 hover:border-[#8B5E34] hover:shadow-[0_8px_24px_rgba(51,40,30,0.06)] hover:-translate-y-0.5",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold tracking-widest text-[#8C7A6B] uppercase">
          {label}
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#F9F8F6] border border-[#E5D9C5] text-[#8B5E34] shadow-xs">
          <Icon className="h-3.5 w-3.5 text-[#8B5E34]" />
        </span>
      </div>
      <div className="mt-2 font-display text-2xl font-bold tracking-tight text-[#33281E] tabular">
        {value}
      </div>
      {hint && <p className="mt-1 text-[11px] font-medium text-[#8C7A6B]">{hint}</p>}
    </div>
  );
}
