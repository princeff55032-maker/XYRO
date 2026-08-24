import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl text-xs font-semibold transition-all duration-300 ease-in-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5E34] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 disabled:hover:translate-y-0 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#8B5E34] text-white border border-[#8B5E34] hover:bg-[#754E29] active:bg-[#5E3E20] shadow-[0_4px_14px_rgba(139,94,52,0.2)] hover:shadow-[0_6px_20px_rgba(139,94,52,0.3)]",
        destructive:
          "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:border-red-300",
        outline:
          "border border-[#E5D9C5] bg-white text-[#33281E] hover:bg-[#F3EFEA] hover:border-[#8B5E34] active:bg-[#EAE4DC]",
        secondary:
          "bg-[#F9F8F6] text-[#33281E] border border-[#E5D9C5] hover:bg-[#F3EFEA] hover:text-[#33281E] active:bg-[#EAE4DC]",
        ghost:
          "text-[#8C7A6B] hover:bg-[#F3EFEA] hover:text-[#33281E]",
        link:
          "text-[#8B5E34] underline-offset-4 hover:underline hover:translate-y-0",
        success:
          "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100",
        glow:
          "bg-[#8B5E34] text-white border border-[#8B5E34] shadow-[0_0_20px_rgba(139,94,52,0.25)] hover:bg-[#754E29]",
      },

      size: {
        default: "h-9 px-4 py-2",
        sm: "h-7 px-3 text-[11px]",
        lg: "h-10 px-5 text-xs",
        xl: "h-11 px-6 text-sm",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
