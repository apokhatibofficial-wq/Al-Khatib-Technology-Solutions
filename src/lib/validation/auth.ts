import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "3 أحرف على الأقل")
  .max(32, "32 حرفًا كحد أقصى")
  .regex(/^[a-zA-Z0-9_.-]+$/, "أحرف إنجليزية وأرقام و _ . - فقط");

export const passwordSchema = z.string().min(8, "8 أحرف على الأقل");

export const setupSchema = z
  .object({
    setupToken: z.string().min(1, "مطلوب"),
    fullName: z.string().trim().min(2, "الاسم قصير جدًا").max(120),
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  username: z.string().trim().min(1, "مطلوب"),
  password: z.string().min(1, "مطلوب"),
});
