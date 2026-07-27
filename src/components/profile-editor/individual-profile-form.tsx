"use client";

import { useActionState } from "react";
import { updateIndividualProfileAction, updateImageFieldAction } from "@/lib/actions/profile";
import { createProfessionAction } from "@/app/admin/users/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadField } from "@/components/profile-editor/image-upload-field";
import { TaxonomyPicker } from "@/components/taxonomy-picker";

export function IndividualProfileForm({
  userId,
  displayName,
  bio,
  professionId,
  professions,
  avatarUrl,
  coverUrl,
}: {
  userId: string;
  displayName: string;
  bio: string;
  professionId: string | null;
  professions: { id: string; name: string }[];
  avatarUrl: string | null;
  coverUrl: string | null;
}) {
  const boundAction = updateIndividualProfileAction.bind(null, userId);
  const [state, formAction, isPending] = useActionState(boundAction, undefined);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-8">
        <ImageUploadField
          targetUserId={userId}
          folder="avatars"
          currentUrl={avatarUrl}
          shape="circle"
          label="الصورة الشخصية"
          onUploaded={(url) => updateImageFieldAction(userId, "avatarUrl", url)}
        />
        <ImageUploadField
          targetUserId={userId}
          folder="covers"
          currentUrl={coverUrl}
          shape="wide"
          label="صورة الغلاف"
          onUploaded={(url) => updateImageFieldAction(userId, "coverUrl", url)}
        />
      </div>

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
          <Label htmlFor="displayName">الاسم</Label>
          <Input id="displayName" name="displayName" defaultValue={displayName} required />
          {state?.fieldErrors?.displayName && (
            <span className="text-xs font-medium text-danger">{state.fieldErrors.displayName}</span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>المهنة</Label>
          <TaxonomyPicker
            name="professionId"
            placeholder="مثال: طبيب"
            addLabel="مهنة جديدة"
            options={professions}
            defaultValue={professionId}
            createAction={createProfessionAction}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bio">نبذة تعريفية</Label>
          <Textarea id="bio" name="bio" defaultValue={bio} rows={4} placeholder="اكتب نبذة قصيرة عنك..." />
        </div>

        <Button type="submit" className="self-start" disabled={isPending}>
          {isPending ? "جارٍ الحفظ..." : "حفظ"}
        </Button>
      </form>
    </div>
  );
}
