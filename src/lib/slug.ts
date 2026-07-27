import "server-only";
import { prisma } from "@/lib/prisma";

function slugify(input: string): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    // Keep Unicode letters/numbers and hyphens only (works for Arabic or Latin usernames).
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || `page-${Math.random().toString(36).slice(2, 8)}`;
}

export async function generateUniqueSlug(seed: string): Promise<string> {
  const base = slugify(seed);
  let candidate = base;
  let attempt = 1;

  while (await prisma.publicPage.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }

  return candidate;
}
