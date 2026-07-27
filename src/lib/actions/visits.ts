"use server";

import { prisma } from "@/lib/prisma";

export async function recordVisitAction(slug: string, source: "LINK" | "QR") {
  const page = await prisma.publicPage.findUnique({ where: { slug }, select: { id: true, published: true } });
  if (!page || !page.published) return;

  await prisma.visit.create({ data: { pageId: page.id, source } });
}
