"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { hashPassword, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac";
import { generateUniqueSlug } from "@/lib/slug";
import { createUserSchema, updateUserSchema } from "@/lib/validation/user";
import type { ContactButtonKind } from "@/generated/prisma/client";

type CreateUserFieldErrors = Partial<
  Record<
    "fullName" | "username" | "password" | "phone" | "location" | "type" | "professionId" | "activityCategoryId",
    string
  >
>;

export type CreateUserFormState =
  | {
      error?: string;
      fieldErrors?: CreateUserFieldErrors;
      success?: boolean;
    }
  | undefined;

const CONTACT_BUTTON_KINDS: ContactButtonKind[] = [
  "CALL",
  "WHATSAPP",
  "INSTAGRAM",
  "TELEGRAM",
  "FACEBOOK",
  "CUSTOM_LINK",
];

export async function createUserAction(
  _prevState: CreateUserFormState,
  formData: FormData,
): Promise<CreateUserFormState> {
  const admin = await requirePermission(PERMISSIONS.USERS_MANAGE);

  const parsed = createUserSchema.safeParse({
    fullName: formData.get("fullName"),
    username: formData.get("username"),
    password: formData.get("password"),
    phone: formData.get("phone") ?? "",
    location: formData.get("location") ?? "",
    type: formData.get("type"),
    professionId: formData.get("professionId") ?? "",
    activityCategoryId: formData.get("activityCategoryId") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: CreateUserFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof CreateUserFieldErrors;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const data = parsed.data;
  const passwordHash = await hashPassword(data.password);
  const slug = await generateUniqueSlug(data.username);

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: data.username,
          passwordHash,
          role: data.type,
          fullName: data.fullName,
          phone: data.phone || null,
          location: data.location || null,
          active: true,
          createdById: admin.id,
        },
      });

      await tx.subscription.create({
        data: { userId: user.id, status: "UNPAID" },
      });

      const page = await tx.publicPage.create({
        data: {
          userId: user.id,
          type: data.type,
          slug,
        },
      });

      await tx.contactButton.createMany({
        data: CONTACT_BUTTON_KINDS.map((kind, index) => ({
          pageId: page.id,
          kind,
          enabled: false,
          sortOrder: index,
        })),
      });

      if (data.type === "INDIVIDUAL") {
        await tx.individualProfile.create({
          data: {
            pageId: page.id,
            displayName: data.fullName,
            professionId: data.professionId || null,
          },
        });
      } else {
        await tx.businessProfile.create({
          data: {
            pageId: page.id,
            companyName: data.fullName,
            activityCategoryId: data.activityCategoryId || null,
          },
        });
      }
    });
  } catch {
    return { fieldErrors: { username: "اسم المستخدم هذا مستخدم بالفعل" } };
  }

  await logAudit({
    actorId: admin.id,
    action: "user.create",
    summary: `أنشأ حسابًا جديدًا (${data.type === "INDIVIDUAL" ? "فرد" : "شركة"}): ${data.fullName}`,
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function toggleUserActiveAction(userId: string) {
  const admin = await requirePermission(PERMISSIONS.USERS_MANAGE);

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || (target.role !== "INDIVIDUAL" && target.role !== "BUSINESS")) return;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { active: !target.active },
  });

  await logAudit({
    actorId: admin.id,
    targetUserId: userId,
    action: updated.active ? "user.activate" : "user.deactivate",
    summary: `${updated.active ? "فعّل" : "عطّل"} حساب ${target.fullName}`,
  });

  revalidatePath("/admin/users");
}

export async function createActivityCategoryAction(
  name: string,
): Promise<{ id: string; name: string } | { error: string }> {
  await requirePermission(PERMISSIONS.USERS_MANAGE);
  const trimmed = name.trim();
  if (!trimmed) return { error: "الاسم مطلوب" };

  try {
    const category = await prisma.activityCategory.create({ data: { name: trimmed } });
    revalidatePath("/admin/users");
    return { id: category.id, name: category.name };
  } catch {
    return { error: "هذه الفئة موجودة بالفعل" };
  }
}

export async function createProfessionAction(
  name: string,
): Promise<{ id: string; name: string } | { error: string }> {
  await requirePermission(PERMISSIONS.USERS_MANAGE);
  const trimmed = name.trim();
  if (!trimmed) return { error: "الاسم مطلوب" };

  try {
    const profession = await prisma.profession.create({ data: { name: trimmed } });
    revalidatePath("/admin/users");
    return { id: profession.id, name: profession.name };
  } catch {
    return { error: "هذه المهنة موجودة بالفعل" };
  }
}

type UpdateUserFieldErrors = Partial<Record<"fullName" | "phone" | "location" | "newPassword", string>>;

export type UpdateUserFormState =
  | {
      error?: string;
      fieldErrors?: UpdateUserFieldErrors;
      success?: boolean;
    }
  | undefined;

export async function updateUserAction(
  userId: string,
  _prevState: UpdateUserFormState,
  formData: FormData,
): Promise<UpdateUserFormState> {
  const admin = await requirePermission(PERMISSIONS.USERS_MANAGE);

  const parsed = updateUserSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone") ?? "",
    location: formData.get("location") ?? "",
    newPassword: formData.get("newPassword") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: UpdateUserFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof UpdateUserFieldErrors;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || (target.role !== "INDIVIDUAL" && target.role !== "BUSINESS")) {
    return { error: "الحساب غير موجود" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: parsed.data.fullName,
      phone: parsed.data.phone || null,
      location: parsed.data.location || null,
      ...(parsed.data.newPassword ? { passwordHash: await hashPassword(parsed.data.newPassword) } : {}),
    },
  });

  await logAudit({
    actorId: admin.id,
    targetUserId: userId,
    action: "user.update",
    summary: `عدّل بيانات حساب ${target.fullName}${parsed.data.newPassword ? " (وأعاد تعيين كلمة المرور)" : ""}`,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}
