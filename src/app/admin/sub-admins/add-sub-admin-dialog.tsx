"use client";

import { Plus } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { createSubAdminAction } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PermissionCheckboxes } from "@/components/admin/permission-checkboxes";

export function AddSubAdminDialog() {
  const [open, setOpen] = useState(false);
  const [instanceKey, setInstanceKey] = useState(0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setInstanceKey((k) => k + 1);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          إضافة مشرف فرعي
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[520px]">
        <DialogTitle>إضافة مشرف فرعي جديد</DialogTitle>
        <AddSubAdminForm key={instanceKey} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function AddSubAdminForm({ onSuccess }: { onSuccess: () => void }) {
  const [state, formAction, isPending] = useActionState(createSubAdminAction, undefined);

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state?.success, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      {state?.error && (
        <div className="rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm font-medium text-danger">
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullName">الاسم الكامل</Label>
        <Input id="fullName" name="fullName" required />
        {state?.fieldErrors?.fullName && (
          <span className="text-xs font-medium text-danger">{state.fieldErrors.fullName}</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="username">اسم المستخدم</Label>
        <Input id="username" name="username" dir="ltr" required />
        {state?.fieldErrors?.username && (
          <span className="text-xs font-medium text-danger">{state.fieldErrors.username}</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">كلمة المرور</Label>
        <Input id="password" name="password" type="password" dir="ltr" required />
        {state?.fieldErrors?.password && (
          <span className="text-xs font-medium text-danger">{state.fieldErrors.password}</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>الصلاحيات</Label>
        <PermissionCheckboxes />
      </div>

      <DialogFooter>
        <Button type="submit" className="flex-1" disabled={isPending}>
          {isPending ? "جارٍ الإضافة..." : "إضافة"}
        </Button>
        <DialogClose asChild>
          <Button type="button" variant="secondary" className="flex-1">
            إلغاء
          </Button>
        </DialogClose>
      </DialogFooter>
    </form>
  );
}
