import * as React from "react";
import { cn } from "@/lib/utils";

function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "w-full appearance-none rounded-[10px] border border-[#dbe4ea] bg-white bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%235a7385%22><path d=%22M5.5 7.5l4.5 4.5 4.5-4.5%22 stroke=%22%235a7385%22 stroke-width=%221.5%22 fill=%22none%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>')] bg-[left_0.9rem_center] bg-no-repeat px-3.5 py-2.5 text-sm text-ink",
        "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20",
        "disabled:cursor-not-allowed disabled:bg-[#f3f6f8] disabled:text-sub",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export { Select };
