"use client";

import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ALL_PERMISSION_KEYS, PERMISSION_DESCRIPTIONS, PERMISSION_LABELS } from "@/lib/rbac";

export function PermissionCheckboxes({ defaultChecked = [] }: { defaultChecked?: string[] }) {
  const idPrefix = useId();

  return (
    <div className="flex flex-col gap-3">
      {ALL_PERMISSION_KEYS.map((key) => {
        const inputId = `${idPrefix}-${key}`;
        return (
          <label
            key={key}
            htmlFor={inputId}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e7edf1] p-3.5 hover:bg-[#f8fafb]"
          >
            <Checkbox
              id={inputId}
              name="permissions"
              value={key}
              defaultChecked={defaultChecked.includes(key)}
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm font-bold text-ink">{PERMISSION_LABELS[key]}</span>
              <span className="block text-xs text-sub">{PERMISSION_DESCRIPTIONS[key]}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
