"use client";

import { Plus } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { createActivityCategoryAction, createProfessionAction, createUserAction } from "./actions";
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
import { Select } from "@/components/ui/select";
import { TaxonomyPicker } from "@/components/taxonomy-picker";

type Option = { id: string; name: string };

export function AddUserDialog({
  professions,
  activityCategories,
}: {
  professions: Option[];
  activityCategories: Option[];
}) {
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
          إضافة مستخدم
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>إضافة مستخدم جديد</DialogTitle>
        <AddUserForm
          key={instanceKey}
          professions={professions}
          activityCategories={activityCategories}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function AddUserForm({
  professions,
  activityCategories,
  onSuccess,
}: {
  professions: Option[];
  activityCategories: Option[];
  onSuccess: () => void;
}) {
  const [type, setType] = useState<"INDIVIDUAL" | "BUSINESS">("INDIVIDUAL");
  const [state, formAction, isPending] = useActionState(createUserAction, undefined);

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
        <Label htmlFor="phone">رقم الهاتف</Label>
        <Input id="phone" name="phone" dir="ltr" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="location">الموقع الجغرافي</Label>
        <Input id="location" name="location" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="type">نوع الحساب</Label>
        <Select
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as "INDIVIDUAL" | "BUSINESS")}
        >
          <option value="INDIVIDUAL">فرد</option>
          <option value="BUSINESS">شركة</option>
        </Select>
      </div>

      {type === "BUSINESS" ? (
        <div className="flex flex-col gap-1.5">
          <Label>فئة النشاط</Label>
          <TaxonomyPicker
            name="activityCategoryId"
            placeholder="مثال: مطعم"
            addLabel="فئة جديدة"
            options={activityCategories}
            createAction={createActivityCategoryAction}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label>المهنة</Label>
          <TaxonomyPicker
            name="professionId"
            placeholder="مثال: طبيب"
            addLabel="مهنة جديدة"
            options={professions}
            createAction={createProfessionAction}
          />
        </div>
      )}

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
