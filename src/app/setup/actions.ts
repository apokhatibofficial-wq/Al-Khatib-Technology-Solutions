"use server";

import { redirect } from "next/navigation";
import { createSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setupSchema } from "@/lib/validation/auth";

type SetupFieldErrors = Partial<
  Record<"setupToken" | "fullName" | "username" | "password" | "confirmPassword", string>
>;

export type SetupFormState =
  | {
      error?: string;
      fieldErrors?: SetupFieldErrors;
    }
  | undefined;

export async function createSuperAdminAction(
  _prevState: SetupFormState,
  formData: FormData,
): Promise<SetupFormState> {
  const existing = await prisma.user.count();
  if (existing > 0) {
    redirect("/login");
  }

  const parsed = setupSchema.safeParse({
    setupToken: formData.get("setupToken"),
    fullName: formData.get("fullName"),
    username: formData.get("username"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const fieldErrors: SetupFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof SetupFieldErrors;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  if (!process.env.SETUP_TOKEN || parsed.data.setupToken !== process.env.SETUP_TOKEN) {
    return { error: "رمز الإعداد غير صحيح." };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  let userId: string;
  try {
    const user = await prisma.user.create({
      data: {
        username: parsed.data.username,
        passwordHash,
        role: "SUPER_ADMIN",
        fullName: parsed.data.fullName,
        active: true,
      },
    });
    userId = user.id;
  } catch {
    return { fieldErrors: { username: "اسم المستخدم هذا مستخدم بالفعل" } };
  }

  await createSession(userId);
  redirect("/admin");
}
