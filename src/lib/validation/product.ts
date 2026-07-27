import { z } from "zod";

export const productCategorySchema = z.object({
  name: z.string().trim().min(1, "الاسم مطلوب").max(60),
});

export const dynamicFieldDefSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[a-zA-Z0-9_]+$/, "المعرّف يجب أن يكون أحرفًا إنجليزية وأرقامًا و _ فقط"),
  label: z.string().trim().min(1).max(60),
  type: z.enum(["text", "number"]),
});

export type DynamicFieldDef = z.infer<typeof dynamicFieldDefSchema>;

export const productSchema = z.object({
  name: z.string().trim().min(1, "اسم المنتج مطلوب").max(160),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  imageUrl: z.string().trim().max(600).optional().or(z.literal("")),
  price: z.coerce.number().min(0, "السعر غير صالح"),
  discountCode: z.string().trim().max(60).optional().or(z.literal("")),
  quantityRemaining: z.string().optional().or(z.literal("")),
  // Hidden input always submits a string ("on" or ""); FormData.get() never
  // actually yields null for a present field, so this must accept "".
  deliveryEnabled: z.string().optional(),
  contactMode: z.enum(["NONE", "CALL", "LINK"]),
  contactValue: z.string().trim().max(300).optional().or(z.literal("")),
  categoryId: z.string().optional().or(z.literal("")),
});

export const couponSchema = z.object({
  title: z.string().trim().min(1, "العنوان مطلوب").max(160),
  description: z.string().trim().max(400).optional().or(z.literal("")),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "لون غير صالح"),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
  placement: z.enum(["top"]).default("top"),
});
