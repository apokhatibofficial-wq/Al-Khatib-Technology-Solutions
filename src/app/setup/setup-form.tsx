"use client";

import { useActionState } from "react";
import { createSuperAdminAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SetupForm() {
  const [state, formAction, isPending] = useActionState(createSuperAdminAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error && (
        <div className="rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm font-medium text-danger">
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="setupToken">رمز الإعداد (SETUP_TOKEN)</Label>
        <Input id="setupToken" name="setupToken" type="password" autoComplete="off" required />
        {state?.fieldErrors?.setupToken && (
          <span className="text-xs font-medium text-danger">{state.fieldErrors.setupToken}</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullName">الاسم الكامل</Label>
        <Input id="fullName" name="fullName" autoComplete="name" required />
        {state?.fieldErrors?.fullName && (
          <span className="text-xs font-medium text-danger">{state.fieldErrors.fullName}</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="username">اسم المستخدم</Label>
        <Input id="username" name="username" autoComplete="username" dir="ltr" required />
        {state?.fieldErrors?.username && (
          <span className="text-xs font-medium text-danger">{state.fieldErrors.username}</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">كلمة المرور</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          dir="ltr"
          required
        />
        {state?.fieldErrors?.password && (
          <span className="text-xs font-medium text-danger">{state.fieldErrors.password}</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          dir="ltr"
          required
        />
        {state?.fieldErrors?.confirmPassword && (
          <span className="text-xs font-medium text-danger">{state.fieldErrors.confirmPassword}</span>
        )}
      </div>

      <Button type="submit" size="lg" className="mt-2 w-full" disabled={isPending}>
        {isPending ? "جارٍ الإنشاء..." : "إنشاء حساب المشرف العام"}
      </Button>
    </form>
  );
}
