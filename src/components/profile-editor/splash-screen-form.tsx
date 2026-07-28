"use client";

import { useActionState, useState } from "react";
import { updateSplashScreenAction, updateImageFieldAction } from "@/lib/actions/profile";
import { ImageUploadField } from "@/components/profile-editor/image-upload-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const DURATIONS = [3, 4, 5] as const;

export function SplashScreenForm({
  userId,
  splashEnabled,
  splashImageUrl,
  splashDurationSeconds,
}: {
  userId: string;
  splashEnabled: boolean;
  splashImageUrl: string | null;
  splashDurationSeconds: number;
}) {
  const boundAction = updateSplashScreenAction.bind(null, userId);
  const [state, formAction, isPending] = useActionState(boundAction, undefined);
  const [enabled, setEnabled] = useState(splashEnabled);
  const [imageUrl, setImageUrl] = useState(splashImageUrl);
  const [duration, setDuration] = useState(splashDurationSeconds);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state?.error && (
        <div className="rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm font-medium text-danger">{state.error}</div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-success/10 px-3.5 py-2.5 text-sm font-medium text-success">
          تم حفظ إعدادات شاشة البدء. لا تنسَ الضغط على (نشر) لإظهارها للجمهور.
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <Label>تفعيل شاشة البدء</Label>
          <p className="mt-0.5 text-xs leading-5 text-sub">
            شاشة تمهيدية تظهر للزائر قبل صفحتك، بصورة خلفية وشعارك فوقها وأزرار سريعة، لمدة محددة ثم تختفي تلقائيًا.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
        <input type="hidden" name="splashEnabled" value={enabled ? "on" : ""} />
      </div>

      {enabled && (
        <>
          <ImageUploadField
            targetUserId={userId}
            folder="splash"
            currentUrl={imageUrl}
            shape="wide"
            label="صورة خلفية شاشة البدء"
            onUploaded={(url) => {
              setImageUrl(url);
              updateImageFieldAction(userId, "splashImageUrl", url);
            }}
          />

          <div className="flex flex-col gap-2">
            <Label>مدة العرض</Label>
            <Select
              name="splashDurationSeconds"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-40"
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d} ثواني
                </option>
              ))}
            </Select>
            {state?.fieldErrors?.splashDurationSeconds && (
              <span className="text-xs font-medium text-danger">{state.fieldErrors.splashDurationSeconds}</span>
            )}
          </div>

          <p className="text-xs leading-5 text-sub">
            أزرار شاشة البدء هي نفسها أزرار التواصل المفعّلة أسفل هذه الصفحة (اتصال، واتساب، ...)، بالإضافة إلى زر
            لعرض المنتجات مباشرة.
          </p>
        </>
      )}

      {!enabled && <input type="hidden" name="splashDurationSeconds" value={duration} />}

      <Button type="submit" className="self-start" disabled={isPending}>
        {isPending ? "جارٍ الحفظ..." : "حفظ"}
      </Button>
    </form>
  );
}
