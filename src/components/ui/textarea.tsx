import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-xl border border-[#E5D9C5] bg-white px-3 py-2 text-sm text-[#33281E] placeholder:text-[#8C7A6B]/60 transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-[#8B5E34]/20 focus:border-[#8B5E34] focus:bg-white",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#F3EFEA]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
