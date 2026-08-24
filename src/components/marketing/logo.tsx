import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("h-8 w-8", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="xyro-mark-warm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A07850" />
          <stop offset="1" stopColor="#8B5E34" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#8B5E34" />

      <rect
        x="1.5"
        y="1.5"
        width="61"
        height="61"
        rx="12.5"
        fill="none"
        stroke="#E5D9C5"
        strokeOpacity="0.4"
        strokeWidth="1.5"
      />
      <path
        d="M19 18 L32 30.5 L45 18"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 46 L32 33.5 L45 46"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-lg font-bold tracking-[0.18em] text-[#33281E]">
        XYRO
      </span>
    </span>
  );
}
