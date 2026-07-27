import { z } from "zod";
import { passwordSchema, usernameSchema } from "@/lib/validation/auth";

export const createSubAdminSchema = z.object({
  fullName: z.string().trim().min(2, "الاسم قصير جدًا").max(120),
  username: usernameSchema,
  password: passwordSchema,
});

export const updateSubAdminSchema = z.object({
  fullName: z.string().trim().min(2, "الاسم قصير جدًا").max(120),
  newPassword: z.union([passwordSchema, z.literal("")]).optional(),
});
