"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { hashPassword, requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPermissionKey } from "@/lib/rbac";
import { createSubAdminSchema, updateSubAdminSchema } from "@/lib/validation/subadmin";

type CreateSubAdminFieldErrors = Partial<Record<"fullName" | "username" | "password", string>>;

export type CreateSubAdminFormState =
  | { error?: string; fieldErrors?: CreateSubAdminFieldErrors; success?: boolean }
  | undefined;

function extractPermissions(formData: FormData): string[] {
  return formData
    .getAll("permissions")
    .map(String)
    .filter(isPermissionKey);
}

export async function createSubAdminAction(
  _prevState: CreateSubAdminFormState,
  formData: FormData,
): Promise<CreateSubAdminFormState> {
  const admin = await requireSuperAdmin();

  const parsed = createSubAdminSchema.safeParse({
    fullName: formData.get("fullName"),
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: CreateSubAdminFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof CreateSubAdminFieldErrors;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const permissions = extractPermissions(formData);
  const passwordHash = await hashPassword(parsed.data.password);

  try {
    await prisma.user.create({
      data: {
        username: parsed.data.username,
        passwordHash,
        role: "SUB_ADMIN",
        fullName: parsed.data.fullName,
        active: true,
        createdById: admin.id,
        permissions: { create: permissions.map((key) => ({ key })) },
      },
    });
  } catch {
    return { fieldErrors: { username: "اسم المستخدم هذا مستخدم بالفعل" } };
  }

  await logAudit({
    actorId: admin.id,
    action: "subadmin.create",
    summary: `أنشأ مشرفًا فرعيًا جديدًا: ${parsed.data.fullName}`,
  });

  revalidatePath("/admin/sub-admins");
  return { success: true };
}

type UpdateSubAdminFieldErrors = Partial<Record<"fullName" | "newPassword", string>>;

export type UpdateSubAdminFormState =
  | { error?: string; fieldErrors?: UpdateSubAdminFieldErrors; success?: boolean }
  | undefined;

export async function updateSubAdminAction(
  subAdminId: string,
  _prevState: UpdateSubAdminFormState,
  formData: FormData,
): Promise<UpdateSubAdminFormState> {
  const admin = await requireSuperAdmin();

  const target = await prisma.user.findUnique({ where: { id: subAdminId } });
  if (!target || target.role !== "SUB_ADMIN") {
    return { error: "المشرف الفرعي غير موجود" };
  }

  const parsed = updateSubAdminSchema.safeParse({
    fullName: formData.get("fullName"),
    newPassword: formData.get("newPassword") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: UpdateSubAdminFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof UpdateSubAdminFieldErrors;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const permissions = extractPermissions(formData);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: subAdminId },
      data: {
        fullName: parsed.data.fullName,
        ...(parsed.data.newPassword
          ? { passwordHash: await hashPassword(parsed.data.newPassword) }
          : {}),
      },
    }),
    prisma.subAdminPermission.deleteMany({ where: { userId: subAdminId } }),
    prisma.subAdminPermission.createMany({
      data: permissions.map((key) => ({ userId: subAdminId, key })),
    }),
  ]);

  await logAudit({
    actorId: admin.id,
    targetUserId: subAdminId,
    action: "subadmin.update",
    summary: `عدّل بيانات وصلاحيات المشرف الفرعي ${target.fullName}`,
  });

  revalidatePath("/admin/sub-admins");
  revalidatePath(`/admin/sub-admins/${subAdminId}`);
  return { success: true };
}

export async function toggleSubAdminActiveAction(subAdminId: string) {
  const admin = await requireSuperAdmin();

  const target = await prisma.user.findUnique({ where: { id: subAdminId } });
  if (!target || target.role !== "SUB_ADMIN") return;

  const updated = await prisma.user.update({
    where: { id: subAdminId },
    data: { active: !target.active },
  });

  await logAudit({
    actorId: admin.id,
    targetUserId: subAdminId,
    action: updated.active ? "subadmin.activate" : "subadmin.deactivate",
    summary: `${updated.active ? "فعّل" : "عطّل"} حساب المشرف الفرعي ${target.fullName}`,
  });

  revalidatePath("/admin/sub-admins");
}
