"use client";

import { useActionState, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { updateAppearanceAction } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const TEMPLATES = [
  { key: "classic", label: "كلاسيكي", description: "غلاف وصورة دائرية وأزرار — التصميم الافتراضي" },
  { key: "list", label: "قائمة", description: "عرض المحتوى والمنتجات كقائمة عمودية مبسّطة" },
  { key: "minimal", label: "مينيمال", description: "تصميم مركزي هادئ بأقل قدر من العناصر" },
] as const;

export function AppearanceForm({
  userId,
  brandColor,
  layoutTemplate,
}: {
  userId: string;
  brandColor: string;
  layoutTemplate: string;
}) {
  const boundAction = updateAppearanceAction.bind(null, userId);
  const [state, formAction, isPending] = useActionState(boundAction, undefined);
  const [color, setColor] = useState(brandColor);
  const [template, setTemplate] = useState(layoutTemplate);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state?.error && (
        <div className="rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm font-medium text-danger">{state.error}</div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-success/10 px-3.5 py-2.5 text-sm font-medium text-success">
          تم حفظ التعديلات. لا تنسَ الضغط على (نشر) لإظهارها للجمهور.
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label>لون الأزرار والعناصر البارزة</Label>
        <div className="flex flex-wrap items-start gap-4">
          <HexColorPicker color={color} onChange={setColor} />
          <div className="flex flex-col gap-2">
            <div
              className="h-11 w-40 rounded-lg border border-[#e7edf1]"
              style={{ backgroundColor: color }}
            />
            <Input
              name="brandColor"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              dir="ltr"
              className="w-40"
            />
          </div>
        </div>
        {state?.fieldErrors?.brandColor && (
          <span className="text-xs font-medium text-danger">{state.fieldErrors.brandColor}</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label>هيكلية عرض الصفحة</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTemplate(t.key)}
              className={cn(
                "rounded-xl border-2 p-3.5 text-start transition-colors",
                template === t.key ? "border-brand bg-brand-light" : "border-[#e7edf1] hover:border-brand/40",
              )}
            >
              <div className="text-sm font-bold text-ink">{t.label}</div>
              <div className="mt-1 text-xs leading-5 text-sub">{t.description}</div>
            </button>
          ))}
        </div>
        <input type="hidden" name="layoutTemplate" value={template} />
      </div>

      <Button type="submit" className="self-start" disabled={isPending}>
        {isPending ? "جارٍ الحفظ..." : "حفظ"}
      </Button>
    </form>
  );
}
