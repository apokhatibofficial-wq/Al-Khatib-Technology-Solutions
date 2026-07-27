import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "w-full rounded-[10px] border border-[#dbe4ea] bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-sub/70",
        "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20",
        "disabled:cursor-not-allowed disabled:bg-[#f3f6f8] disabled:text-sub",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
