import { z } from "zod";
import { passwordSchema, usernameSchema } from "@/lib/validation/auth";

export const createUserSchema = z.object({
  fullName: z.string().trim().min(2, "الاسم قصير جدًا").max(120),
  username: usernameSchema,
  password: passwordSchema,
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  location: z.string().trim().max(160).optional().or(z.literal("")),
  type: z.enum(["INDIVIDUAL", "BUSINESS"]),
  professionId: z.string().optional().or(z.literal("")),
  activityCategoryId: z.string().optional().or(z.literal("")),
});

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(2, "الاسم قصير جدًا").max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  location: z.string().trim().max(160).optional().or(z.literal("")),
  newPassword: z.union([passwordSchema, z.literal("")]).optional(),
});
