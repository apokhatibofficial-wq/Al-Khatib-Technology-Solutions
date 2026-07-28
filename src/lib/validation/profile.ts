import { z } from "zod";

export const individualProfileSchema = z.object({
  displayName: z.string().trim().min(2, "الاسم قصير جدًا").max(120),
  professionId: z.string().optional().or(z.literal("")),
  bio: z.string().trim().max(600).optional().or(z.literal("")),
});

export const businessCompanySchema = z.object({
  companyName: z.string().trim().min(2, "الاسم قصير جدًا").max(120),
  activityCategoryId: z.string().optional().or(z.literal("")),
  description: z.string().trim().max(600).optional().or(z.literal("")),
});

export const appearanceSchema = z.object({
  brandColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "لون غير صالح"),
  layoutTemplate: z.enum(["classic", "list", "minimal", "premium"]),
});

export const splashScreenSchema = z.object({
  splashEnabled: z.string().optional(),
  splashImageUrl: z.string().trim().optional().or(z.literal("")),
  splashDurationSeconds: z.coerce.number().int().min(3, "3 إلى 5 ثواني").max(5, "3 إلى 5 ثواني"),
});

export const contactButtonKinds = [
  "CALL",
  "WHATSAPP",
  "INSTAGRAM",
  "TELEGRAM",
  "FACEBOOK",
  "CUSTOM_LINK",
] as const;
