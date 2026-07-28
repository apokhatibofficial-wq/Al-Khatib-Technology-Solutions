"use server";

import { revalidatePath } from "next/cache";
import { markPageDirty } from "@/lib/actions/publish";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { authorizeProfileEdit } from "@/lib/profile-access";
import {
  appearanceSchema,
  businessCompanySchema,
  individualProfileSchema,
  splashScreenSchema,
} from "@/lib/validation/profile";

type FieldErrors<T extends string> = Partial<Record<T, string>>;

export type IndividualProfileFormState =
  | { error?: string; fieldErrors?: FieldErrors<"displayName" | "professionId" | "bio">; success?: boolean }
  | undefined;

export async function updateIndividualProfileAction(
  userId: string,
  _prevState: IndividualProfileFormState,
  formData: FormData,
): Promise<IndividualProfileFormState> {
  const actor = await authorizeProfileEdit(userId);

  const parsed = individualProfileSchema.safeParse({
    displayName: formData.get("displayName"),
    professionId: formData.get("professionId") ?? "",
    bio: formData.get("bio") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: FieldErrors<"displayName" | "professionId" | "bio"> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof typeof fieldErrors;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const page = await prisma.publicPage.findUnique({ where: { userId } });
  if (!page) return { error: "الصفحة غير موجودة" };

  await prisma.individualProfile.update({
    where: { pageId: page.id },
    data: {
      displayName: parsed.data.displayName,
      professionId: parsed.data.professionId || null,
      bio: parsed.data.bio || "",
    },
  });
  await markPageDirty(page.id);

  await logAudit({
    actorId: actor.id,
    targetUserId: userId,
    action: "profile.update",
    summary: actor.id === userId ? "عدّل الملف الأساسي" : "عدّل الملف الأساسي نيابة عن المستخدم",
  });

  revalidatePath("/dashboard/profile");
  revalidatePath(`/admin/editor`);
  return { success: true };
}

export type BusinessCompanyFormState =
  | {
      error?: string;
      fieldErrors?: FieldErrors<"companyName" | "activityCategoryId" | "description">;
      success?: boolean;
    }
  | undefined;

export async function updateBusinessCompanyAction(
  userId: string,
  _prevState: BusinessCompanyFormState,
  formData: FormData,
): Promise<BusinessCompanyFormState> {
  const actor = await authorizeProfileEdit(userId);

  const parsed = businessCompanySchema.safeParse({
    companyName: formData.get("companyName"),
    activityCategoryId: formData.get("activityCategoryId") ?? "",
    description: formData.get("description") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: FieldErrors<"companyName" | "activityCategoryId" | "description"> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof typeof fieldErrors;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const page = await prisma.publicPage.findUnique({ where: { userId } });
  if (!page) return { error: "الصفحة غير موجودة" };

  await prisma.businessProfile.update({
    where: { pageId: page.id },
    data: {
      companyName: parsed.data.companyName,
      activityCategoryId: parsed.data.activityCategoryId || null,
      description: parsed.data.description || "",
    },
  });
  await markPageDirty(page.id);

  await logAudit({
    actorId: actor.id,
    targetUserId: userId,
    action: "profile.update",
    summary: actor.id === userId ? "عدّل بيانات الشركة" : "عدّل بيانات الشركة نيابة عن المستخدم",
  });

  revalidatePath("/dashboard/company");
  revalidatePath(`/admin/editor`);
  return { success: true };
}

export type AppearanceFormState =
  | { error?: string; fieldErrors?: FieldErrors<"brandColor" | "layoutTemplate">; success?: boolean }
  | undefined;

export async function updateAppearanceAction(
  userId: string,
  _prevState: AppearanceFormState,
  formData: FormData,
): Promise<AppearanceFormState> {
  const actor = await authorizeProfileEdit(userId);

  const parsed = appearanceSchema.safeParse({
    brandColor: formData.get("brandColor"),
    layoutTemplate: formData.get("layoutTemplate"),
  });

  if (!parsed.success) {
    const fieldErrors: FieldErrors<"brandColor" | "layoutTemplate"> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof typeof fieldErrors;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const page = await prisma.publicPage.findUnique({ where: { userId } });
  if (!page) return { error: "الصفحة غير موجودة" };

  if (parsed.data.layoutTemplate === "premium" && page.type !== "BUSINESS") {
    return { fieldErrors: { layoutTemplate: "هذه الهيكلية متاحة لحسابات الأعمال فقط" } };
  }

  await prisma.publicPage.update({
    where: { id: page.id },
    data: { brandColor: parsed.data.brandColor, layoutTemplate: parsed.data.layoutTemplate },
  });
  await markPageDirty(page.id);

  await logAudit({
    actorId: actor.id,
    targetUserId: userId,
    action: "profile.update",
    summary: actor.id === userId ? "عدّل التخصيص البصري" : "عدّل التخصيص البصري نيابة عن المستخدم",
  });

  revalidatePath("/dashboard/appearance");
  revalidatePath(`/admin/editor`);
  return { success: true };
}

export type SplashScreenFormState =
  | { error?: string; fieldErrors?: FieldErrors<"splashDurationSeconds">; success?: boolean }
  | undefined;

export async function updateSplashScreenAction(
  userId: string,
  _prevState: SplashScreenFormState,
  formData: FormData,
): Promise<SplashScreenFormState> {
  const actor = await authorizeProfileEdit(userId);

  const parsed = splashScreenSchema.safeParse({
    splashEnabled: formData.get("splashEnabled") ?? undefined,
    splashDurationSeconds: formData.get("splashDurationSeconds"),
  });

  if (!parsed.success) {
    const fieldErrors: FieldErrors<"splashDurationSeconds"> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof typeof fieldErrors;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const page = await prisma.publicPage.findUnique({ where: { userId } });
  if (!page) return { error: "الصفحة غير موجودة" };
  if (page.type !== "BUSINESS") return { error: "غير متاح لهذا النوع من الحسابات" };

  await prisma.businessProfile.update({
    where: { pageId: page.id },
    data: {
      splashEnabled: parsed.data.splashEnabled === "on",
      splashDurationSeconds: parsed.data.splashDurationSeconds,
    },
  });
  await markPageDirty(page.id);

  await logAudit({
    actorId: actor.id,
    targetUserId: userId,
    action: "profile.update",
    summary: actor.id === userId ? "عدّل إعدادات شاشة البدء" : "عدّل إعدادات شاشة البدء نيابة عن المستخدم",
  });

  revalidatePath("/dashboard/appearance");
  revalidatePath(`/admin/editor`);
  return { success: true };
}

export async function updateImageFieldAction(
  userId: string,
  field: "avatarUrl" | "coverUrl" | "logoUrl" | "splashImageUrl",
  url: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const actor = await authorizeProfileEdit(userId);

  const page = await prisma.publicPage.findUnique({
    where: { userId },
    include: { individualProfile: true, businessProfile: true },
  });
  if (!page) return { ok: false, error: "الصفحة غير موجودة" };

  if (field === "logoUrl" || field === "splashImageUrl") {
    if (!page.businessProfile) return { ok: false, error: "غير متاح لهذا النوع من الحسابات" };
    await prisma.businessProfile.update({ where: { pageId: page.id }, data: { [field]: url } });
  } else if (page.type === "INDIVIDUAL" && page.individualProfile) {
    await prisma.individualProfile.update({ where: { pageId: page.id }, data: { [field]: url } });
  } else if (page.type === "BUSINESS" && page.businessProfile) {
    await prisma.businessProfile.update({ where: { pageId: page.id }, data: { [field]: url } });
  }

  await markPageDirty(page.id);
  await logAudit({
    actorId: actor.id,
    targetUserId: userId,
    action: "profile.image",
    summary: "حدّث صورة على الصفحة",
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin/editor");
  return { ok: true };
}
