"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { authorizeProfileEdit } from "@/lib/profile-access";
import { couponSchema } from "@/lib/validation/product";

type CouponFieldErrors = Partial<Record<"title" | "color" | "startDate" | "endDate", string>>;
export type CouponFormState = { error?: string; fieldErrors?: CouponFieldErrors; success?: boolean } | undefined;

async function getBusinessProfileOrThrow(userId: string) {
  const page = await prisma.publicPage.findUnique({
    where: { userId },
    include: { businessProfile: true },
  });
  if (!page?.businessProfile) throw new Error("لا يوجد ملف شركة لهذا الحساب");
  return page;
}

export async function createCouponAction(
  userId: string,
  _prevState: CouponFormState,
  formData: FormData,
): Promise<CouponFormState> {
  const actor = await authorizeProfileEdit(userId);

  const parsed = couponSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    color: formData.get("color") || "#e08a1f",
    startDate: formData.get("startDate") ?? "",
    endDate: formData.get("endDate") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: CouponFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof CouponFieldErrors;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const page = await getBusinessProfileOrThrow(userId);
  const data = parsed.data;

  await prisma.coupon.create({
    data: {
      businessId: page.businessProfile!.id,
      title: data.title,
      description: data.description || "",
      color: data.color,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
  });

  await logAudit({
    actorId: actor.id,
    targetUserId: userId,
    action: "coupon.create",
    summary: `أضاف كوبونًا جديدًا: ${data.title}`,
  });

  revalidatePath("/dashboard/coupons");
  revalidatePath("/admin/editor");
  return { success: true };
}

export async function toggleCouponPublishedAction(userId: string, couponId: string) {
  const actor = await authorizeProfileEdit(userId);
  const page = await getBusinessProfileOrThrow(userId);
  const coupon = await prisma.coupon.findFirst({
    where: { id: couponId, businessId: page.businessProfile!.id },
  });
  if (!coupon) return;

  await prisma.coupon.update({ where: { id: couponId }, data: { published: !coupon.published } });

  await logAudit({
    actorId: actor.id,
    targetUserId: userId,
    action: "coupon.toggle",
    summary: `${coupon.published ? "ألغى نشر" : "نشر"} كوبون: ${coupon.title}`,
  });

  revalidatePath("/dashboard/coupons");
  revalidatePath("/admin/editor");
  revalidatePath(`/u/${page.slug}`);
}

export async function deleteCouponAction(userId: string, couponId: string) {
  const actor = await authorizeProfileEdit(userId);
  const page = await getBusinessProfileOrThrow(userId);
  const coupon = await prisma.coupon.findFirst({
    where: { id: couponId, businessId: page.businessProfile!.id },
  });
  if (!coupon) return;

  await prisma.coupon.delete({ where: { id: couponId } });

  await logAudit({
    actorId: actor.id,
    targetUserId: userId,
    action: "coupon.delete",
    summary: `حذف كوبون: ${coupon.title}`,
  });

  revalidatePath("/dashboard/coupons");
  revalidatePath("/admin/editor");
}
