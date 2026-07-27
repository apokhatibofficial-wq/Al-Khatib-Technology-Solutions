import type { LucideIcon } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#dbe4ea] bg-[#fbfcfd] px-6 py-14 text-center",
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-brand">
        <Icon className="h-7 w-7" strokeWidth={1.75} />
      </div>
      <div className="text-base font-extrabold text-ink">{title}</div>
      {description && <div className="max-w-sm text-sm leading-6 text-sub">{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
