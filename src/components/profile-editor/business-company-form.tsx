"use client";

import { useActionState } from "react";
import { updateBusinessCompanyAction, updateImageFieldAction } from "@/lib/actions/profile";
import { createActivityCategoryAction } from "@/app/admin/users/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadField } from "@/components/profile-editor/image-upload-field";
import { TaxonomyPicker } from "@/components/taxonomy-picker";

export function BusinessCompanyForm({
  userId,
  companyName,
  description,
  activityCategoryId,
  activityCategories,
  logoUrl,
}: {
  userId: string;
  companyName: string;
  description: string;
  activityCategoryId: string | null;
  activityCategories: { id: string; name: string }[];
  logoUrl: string | null;
}) {
  const boundAction = updateBusinessCompanyAction.bind(null, userId);
  const [state, formAction, isPending] = useActionState(boundAction, undefined);

  return (
    <div className="flex flex-col gap-6">
      <ImageUploadField
        targetUserId={userId}
        folder="logos"
        currentUrl={logoUrl}
        shape="square"
        label="شعار الشركة"
        onUploaded={(url) => updateImageFieldAction(userId, "logoUrl", url)}
      />

      <form action={formAction} className="flex flex-col gap-4">
        {state?.error && (
          <div className="rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm font-medium text-danger">
            {state.error}
          </div>
        )}
        {state?.success && (
          <div className="rounded-lg bg-success/10 px-3.5 py-2.5 text-sm font-medium text-success">
            تم حفظ التعديلات. لا تنسَ الضغط على (نشر) لإظهارها للجمهور.
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="companyName">اسم الشركة</Label>
          <Input id="companyName" name="companyName" defaultValue={companyName} required />
          {state?.fieldErrors?.companyName && (
            <span className="text-xs font-medium text-danger">{state.fieldErrors.companyName}</span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>نوع النشاط</Label>
          <TaxonomyPicker
            name="activityCategoryId"
            placeholder="مثال: مطعم"
            addLabel="فئة جديدة"
            options={activityCategories}
            defaultValue={activityCategoryId}
            createAction={createActivityCategoryAction}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">الوصف</Label>
          <Textarea id="description" name="description" defaultValue={description} rows={4} />
        </div>

        <Button type="submit" className="self-start" disabled={isPending}>
          {isPending ? "جارٍ الحفظ..." : "حفظ"}
        </Button>
      </form>
    </div>
  );
}
