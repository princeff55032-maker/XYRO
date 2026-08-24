import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-[#E5D9C5] bg-[#F9F8F6] text-[#8B5E34] shadow-sm",
        secondary: "border-[#E5D9C5] bg-[#F9F8F6] text-[#8C7A6B]",
        destructive: "border-red-200 bg-red-50 text-red-700",
        success: "border-emerald-200 bg-emerald-50 text-emerald-800",
        warning: "border-amber-200 bg-amber-50 text-amber-800",
        info: "border-blue-200 bg-blue-50 text-blue-800",
        outline: "border-[#E5D9C5] bg-white text-[#33281E]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
