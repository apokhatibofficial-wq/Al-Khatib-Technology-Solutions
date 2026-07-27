"use client";

import { Camera, Link2, MessageCircle, Phone, Send, Users } from "lucide-react";
import { useActionState, useState } from "react";
import { updateContactButtonsAction } from "@/lib/actions/contact-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { ContactButtonKind } from "@/generated/prisma/client";

const KIND_META: Record<ContactButtonKind, { label: string; icon: typeof Phone; placeholder: string }> = {
  CALL: { label: "اتصال مباشر", icon: Phone, placeholder: "رقم الهاتف" },
  WHATSAPP: { label: "واتساب", icon: MessageCircle, placeholder: "رقم واتساب" },
  INSTAGRAM: { label: "إنستغرام", icon: Camera, placeholder: "رابط الحساب" },
  TELEGRAM: { label: "تيليجرام", icon: Send, placeholder: "رابط أو معرّف تيليجرام" },
  FACEBOOK: { label: "فيسبوك", icon: Users, placeholder: "رابط الصفحة" },
  CUSTOM_LINK: { label: "رابط خارجي", icon: Link2, placeholder: "https://..." },
};

const ORDER: ContactButtonKind[] = ["CALL", "WHATSAPP", "INSTAGRAM", "TELEGRAM", "FACEBOOK", "CUSTOM_LINK"];

export function ContactButtonsForm({
  userId,
  buttons,
  showCustomLabel,
}: {
  userId: string;
  buttons: { kind: ContactButtonKind; enabled: boolean; value: string | null; label: string | null }[];
  showCustomLabel: boolean;
}) {
  const boundAction = updateContactButtonsAction.bind(null, userId);
  const [state, formAction, isPending] = useActionState(boundAction, undefined);
  const [enabledState, setEnabledState] = useState<Record<string, boolean>>(
    Object.fromEntries(buttons.map((b) => [b.kind, b.enabled])),
  );

  const byKind = new Map(buttons.map((b) => [b.kind, b]));

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error && (
        <div className="rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm font-medium text-danger">{state.error}</div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-success/10 px-3.5 py-2.5 text-sm font-medium text-success">
          تم حفظ التعديلات. لا تنسَ الضغط على (نشر) لإظهارها للجمهور.
        </div>
      )}

      {ORDER.map((kind) => {
        const meta = KIND_META[kind];
        const button = byKind.get(kind);
        const Icon = meta.icon;
        const enabled = enabledState[kind] ?? false;

        return (
          <div key={kind} className="rounded-xl border border-[#e7edf1] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Icon className="h-[18px] w-[18px] text-brand" />
                <span className="text-sm font-bold text-ink">{meta.label}</span>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={(checked) => setEnabledState((prev) => ({ ...prev, [kind]: checked }))}
              />
              <input type="hidden" name={`enabled_${kind}`} value={enabled ? "on" : ""} />
            </div>
            {enabled && (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Input
                  name={`value_${kind}`}
                  defaultValue={button?.value ?? ""}
                  placeholder={meta.placeholder}
                  dir="ltr"
                  className="flex-1"
                />
                {showCustomLabel && (
                  <Input
                    name={`label_${kind}`}
                    defaultValue={button?.label ?? ""}
                    placeholder="نص مخصص للزر (اختياري)"
                    className="flex-1"
                  />
                )}
              </div>
            )}
          </div>
        );
      })}

      <Button type="submit" className="self-start" disabled={isPending}>
        {isPending ? "جارٍ الحفظ..." : "حفظ"}
      </Button>
    </form>
  );
}
