"use client";

import { useActionState } from "react";
import { updateUserAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EditUserForm({
  userId,
  fullName,
  phone,
  location,
}: {
  userId: string;
  fullName: string;
  phone: string;
  location: string;
}) {
  const boundAction = updateUserAction.bind(null, userId);
  const [state, formAction, isPending] = useActionState(boundAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error && (
        <div className="rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm font-medium text-danger">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-success/10 px-3.5 py-2.5 text-sm font-medium text-success">
          تم حفظ التعديلات.
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullName">الاسم الكامل</Label>
        <Input id="fullName" name="fullName" defaultValue={fullName} required />
        {state?.fieldErrors?.fullName && (
          <span className="text-xs font-medium text-danger">{state.fieldErrors.fullName}</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">رقم الهاتف</Label>
        <Input id="phone" name="phone" defaultValue={phone} dir="ltr" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="location">الموقع الجغرافي</Label>
        <Input id="location" name="location" defaultValue={location} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="newPassword">كلمة مرور جديدة (اختياري)</Label>
        <Input id="newPassword" name="newPassword" type="password" dir="ltr" placeholder="اتركه فارغًا للإبقاء على كلمة المرور الحالية" />
        {state?.fieldErrors?.newPassword && (
          <span className="text-xs font-medium text-danger">{state.fieldErrors.newPassword}</span>
        )}
      </div>

      <Button type="submit" className="mt-2 self-start" disabled={isPending}>
        {isPending ? "جارٍ الحفظ..." : "حفظ التعديلات"}
      </Button>
    </form>
  );
}
