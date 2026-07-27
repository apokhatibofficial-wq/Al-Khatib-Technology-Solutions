"use server";

import { revalidatePath } from "next/cache";
import { markPageDirty } from "@/lib/actions/publish";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { authorizeProfileEdit } from "@/lib/profile-access";
import { contactButtonKinds } from "@/lib/validation/profile";

export type ContactButtonsFormState = { error?: string; success?: boolean } | undefined;

export async function updateContactButtonsAction(
  userId: string,
  _prevState: ContactButtonsFormState,
  formData: FormData,
): Promise<ContactButtonsFormState> {
  const actor = await authorizeProfileEdit(userId);

  const page = await prisma.publicPage.findUnique({ where: { userId } });
  if (!page) return { error: "الصفحة غير موجودة" };

  await prisma.$transaction(
    contactButtonKinds.map((kind) =>
      prisma.contactButton.update({
        where: { pageId_kind: { pageId: page.id, kind } },
        data: {
          enabled: formData.get(`enabled_${kind}`) === "on",
          value: (formData.get(`value_${kind}`) as string | null)?.trim() || null,
          label: (formData.get(`label_${kind}`) as string | null)?.trim() || null,
        },
      }),
    ),
  );

  await markPageDirty(page.id);

  await logAudit({
    actorId: actor.id,
    targetUserId: userId,
    action: "profile.update",
    summary: actor.id === userId ? "عدّل أزرار التواصل" : "عدّل أزرار التواصل نيابة عن المستخدم",
  });

  revalidatePath("/dashboard/contact-buttons");
  revalidatePath("/admin/editor");
  return { success: true };
}
