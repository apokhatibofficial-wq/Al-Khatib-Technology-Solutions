"use server";

import { revalidatePath } from "next/cache";
import { markPageDirty } from "@/lib/actions/publish";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { authorizeProfileEdit } from "@/lib/profile-access";
import {
  dynamicFieldDefSchema,
  productCategorySchema,
  productSchema,
} from "@/lib/validation/product";
import type { DynamicFieldDef } from "@/lib/validation/product";

async function getBusinessProfileOrThrow(userId: string) {
  const page = await prisma.publicPage.findUnique({
    where: { userId },
    include: { businessProfile: true },
  });
  if (!page?.businessProfile) throw new Error("لا يوجد ملف شركة لهذا الحساب");
  return page;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function createProductCategoryAction(
  userId: string,
  name: string,
): Promise<{ id: string; name: string } | { error: string }> {
  const actor = await authorizeProfileEdit(userId);
  const parsed = productCategorySchema.safeParse({ name });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "خطأ" };

  const page = await getBusinessProfileOrThrow(userId);

  try {
    const category = await prisma.productCategory.create({
      data: { businessId: page.businessProfile!.id, name: parsed.data.name },
    });
    await markPageDirty(page.id);
    await logAudit({
      actorId: actor.id,
      targetUserId: userId,
      action: "category.create",
      summary: `أضاف فئة منتجات جديدة: ${parsed.data.name}`,
    });
    revalidatePath("/dashboard/products");
    revalidatePath("/admin/editor");
    return { id: category.id, name: category.name };
  } catch {
    return { error: "هذه الفئة موجودة بالفعل" };
  }
}

export async function deleteProductCategoryAction(userId: string, categoryId: string) {
  const actor = await authorizeProfileEdit(userId);
  const page = await getBusinessProfileOrThrow(userId);

  const category = await prisma.productCategory.findFirst({
    where: { id: categoryId, businessId: page.businessProfile!.id },
  });
  if (!category) return;

  await prisma.productCategory.delete({ where: { id: categoryId } });
  await markPageDirty(page.id);
  await logAudit({
    actorId: actor.id,
    targetUserId: userId,
    action: "category.delete",
    summary: `حذف فئة المنتجات: ${category.name}`,
  });
  revalidatePath("/dashboard/products");
  revalidatePath("/admin/editor");
}

export async function updateCategoryFieldsAction(
  userId: string,
  categoryId: string,
  fields: DynamicFieldDef[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const actor = await authorizeProfileEdit(userId);
  const page = await getBusinessProfileOrThrow(userId);

  const parsedFields: DynamicFieldDef[] = [];
  for (const field of fields) {
    const parsed = dynamicFieldDefSchema.safeParse(field);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "خطأ" };
    parsedFields.push(parsed.data);
  }

  const category = await prisma.productCategory.findFirst({
    where: { id: categoryId, businessId: page.businessProfile!.id },
  });
  if (!category) return { ok: false, error: "الفئة غير موجودة" };

  await prisma.productCategory.update({
    where: { id: categoryId },
    data: { fieldSchema: parsedFields },
  });
  await markPageDirty(page.id);
  await logAudit({
    actorId: actor.id,
    targetUserId: userId,
    action: "category.update",
    summary: `عدّل الحقول الديناميكية لفئة: ${category.name}`,
  });
  revalidatePath("/dashboard/products");
  revalidatePath("/admin/editor");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

type ProductFieldErrors = Partial<Record<"name" | "price" | "description", string>>;
export type ProductFormState = { error?: string; fieldErrors?: ProductFieldErrors; success?: boolean } | undefined;

function extractDynamicFields(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("field_") && typeof value === "string") {
      values[key.slice("field_".length)] = value;
    }
  }
  return values;
}

export async function createProductAction(
  userId: string,
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const actor = await authorizeProfileEdit(userId);

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    price: formData.get("price"),
    discountCode: formData.get("discountCode") ?? "",
    quantityRemaining: formData.get("quantityRemaining") ?? "",
    deliveryEnabled: formData.get("deliveryEnabled"),
    contactMode: formData.get("contactMode") || "NONE",
    contactValue: formData.get("contactValue") ?? "",
    categoryId: formData.get("categoryId") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: ProductFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof ProductFieldErrors;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const page = await getBusinessProfileOrThrow(userId);
  const data = parsed.data;

  await prisma.product.create({
    data: {
      businessId: page.businessProfile!.id,
      name: data.name,
      description: data.description || "",
      imageUrl: data.imageUrl || null,
      price: data.price,
      discountCode: data.discountCode || null,
      quantityRemaining: data.quantityRemaining ? Number(data.quantityRemaining) : null,
      deliveryEnabled: data.deliveryEnabled === "on",
      contactMode: data.contactMode,
      contactValue: data.contactValue || null,
      categoryId: data.categoryId || null,
      dynamicFields: extractDynamicFields(formData),
    },
  });

  await markPageDirty(page.id);
  await logAudit({
    actorId: actor.id,
    targetUserId: userId,
    action: "product.create",
    summary: `أضاف منتجًا جديدًا: ${data.name}`,
  });

  revalidatePath("/dashboard/products");
  revalidatePath("/admin/editor");
  return { success: true };
}

export async function updateProductAction(
  userId: string,
  productId: string,
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const actor = await authorizeProfileEdit(userId);

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    price: formData.get("price"),
    discountCode: formData.get("discountCode") ?? "",
    quantityRemaining: formData.get("quantityRemaining") ?? "",
    deliveryEnabled: formData.get("deliveryEnabled"),
    contactMode: formData.get("contactMode") || "NONE",
    contactValue: formData.get("contactValue") ?? "",
    categoryId: formData.get("categoryId") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: ProductFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof ProductFieldErrors;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const page = await getBusinessProfileOrThrow(userId);
  const product = await prisma.product.findFirst({
    where: { id: productId, businessId: page.businessProfile!.id },
  });
  if (!product) return { error: "المنتج غير موجود" };

  const data = parsed.data;
  await prisma.product.update({
    where: { id: productId },
    data: {
      name: data.name,
      description: data.description || "",
      imageUrl: data.imageUrl || null,
      price: data.price,
      discountCode: data.discountCode || null,
      quantityRemaining: data.quantityRemaining ? Number(data.quantityRemaining) : null,
      deliveryEnabled: data.deliveryEnabled === "on",
      contactMode: data.contactMode,
      contactValue: data.contactValue || null,
      categoryId: data.categoryId || null,
      dynamicFields: extractDynamicFields(formData),
    },
  });

  await markPageDirty(page.id);
  await logAudit({
    actorId: actor.id,
    targetUserId: userId,
    action: "product.update",
    summary: `عدّل منتج: ${data.name}`,
  });

  revalidatePath("/dashboard/products");
  revalidatePath("/admin/editor");
  return { success: true };
}

export async function toggleProductActiveAction(userId: string, productId: string) {
  const actor = await authorizeProfileEdit(userId);
  const page = await getBusinessProfileOrThrow(userId);
  const product = await prisma.product.findFirst({
    where: { id: productId, businessId: page.businessProfile!.id },
  });
  if (!product) return;

  await prisma.product.update({ where: { id: productId }, data: { active: !product.active } });
  await markPageDirty(page.id);
  await logAudit({
    actorId: actor.id,
    targetUserId: userId,
    action: "product.toggle",
    summary: `${product.active ? "أخفى" : "أظهر"} منتج: ${product.name}`,
  });
  revalidatePath("/dashboard/products");
  revalidatePath("/admin/editor");
}

export async function toggleProductDeliveryAction(userId: string, productId: string) {
  const actor = await authorizeProfileEdit(userId);
  const page = await getBusinessProfileOrThrow(userId);
  const product = await prisma.product.findFirst({
    where: { id: productId, businessId: page.businessProfile!.id },
  });
  if (!product) return;

  await prisma.product.update({
    where: { id: productId },
    data: { deliveryEnabled: !product.deliveryEnabled },
  });
  await markPageDirty(page.id);
  await logAudit({
    actorId: actor.id,
    targetUserId: userId,
    action: "product.toggle_delivery",
    summary: `${product.deliveryEnabled ? "ألغى" : "فعّل"} التوصيل لمنتج: ${product.name}`,
  });
  revalidatePath("/dashboard/products");
  revalidatePath("/admin/editor");
}

export async function deleteProductAction(userId: string, productId: string) {
  const actor = await authorizeProfileEdit(userId);
  const page = await getBusinessProfileOrThrow(userId);
  const product = await prisma.product.findFirst({
    where: { id: productId, businessId: page.businessProfile!.id },
  });
  if (!product) return;

  await prisma.product.delete({ where: { id: productId } });
  await markPageDirty(page.id);
  await logAudit({
    actorId: actor.id,
    targetUserId: userId,
    action: "product.delete",
    summary: `حذف منتج: ${product.name}`,
  });
  revalidatePath("/dashboard/products");
  revalidatePath("/admin/editor");
}
