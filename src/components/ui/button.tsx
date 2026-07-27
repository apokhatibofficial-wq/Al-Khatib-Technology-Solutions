import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-colors disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-brand text-white hover:bg-brand-deep",
        deep: "bg-brand-deep text-white hover:bg-brand-deep/90",
        secondary: "bg-brand-light text-brand-deep hover:bg-brand-light/70",
        outline: "border border-[#dbe4ea] bg-white text-ink hover:bg-[#f3f6f8]",
        ghost: "bg-transparent text-sub hover:bg-[#f3f6f8]",
        danger: "bg-danger text-white hover:bg-danger/90",
        link: "bg-transparent text-brand hover:text-brand-deep p-0 h-auto font-bold",
      },
      size: {
        sm: "h-9 px-3.5 text-[13px]",
        md: "h-11 px-5",
        lg: "h-[52px] px-7 text-[15px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
