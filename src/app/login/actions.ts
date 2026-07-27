"use server";

import { redirect } from "next/navigation";
import { createSession, verifyPassword } from "@/lib/auth";
import { isAdminRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation/auth";

export type LoginFormState = { error?: string } | undefined;

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "الرجاء إدخال اسم المستخدم وكلمة المرور" };
  }

  const user = await prisma.user.findUnique({
    where: { username: parsed.data.username },
  });

  if (!user) {
    return { error: "اسم المستخدم أو كلمة المرور غير صحيحة" };
  }

  const validPassword = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!validPassword) {
    return { error: "اسم المستخدم أو كلمة المرور غير صحيحة" };
  }

  if (!user.active) {
    return { error: "تم تعطيل هذا الحساب. يرجى التواصل مع الإدارة." };
  }

  await createSession(user.id);

  const next = formData.get("next");
  if (typeof next === "string" && next.startsWith("/")) {
    redirect(next);
  }

  redirect(isAdminRole(user.role) ? "/admin" : "/dashboard");
}
