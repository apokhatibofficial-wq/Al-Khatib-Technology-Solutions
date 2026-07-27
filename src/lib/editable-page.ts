import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

const FULL_PAGE_INCLUDE = {
  user: true,
  contactButtons: true,
  individualProfile: { include: { profession: true } },
  businessProfile: {
    include: {
      activityCategory: true,
      categories: { orderBy: { sortOrder: "asc" } as const },
      products: { orderBy: { sortOrder: "asc" } as const },
      coupons: { orderBy: { createdAt: "desc" } as const },
    },
  },
} as const;

export const getEditablePageByUserId = cache((userId: string) => {
  return prisma.publicPage.findUnique({
    where: { userId },
    include: FULL_PAGE_INCLUDE,
  });
});

export const getEditablePageByUsername = cache(async (username: string) => {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || (user.role !== "INDIVIDUAL" && user.role !== "BUSINESS")) return null;
  return getEditablePageByUserId(user.id);
});

export type EditablePage = NonNullable<Awaited<ReturnType<typeof getEditablePageByUserId>>>;
