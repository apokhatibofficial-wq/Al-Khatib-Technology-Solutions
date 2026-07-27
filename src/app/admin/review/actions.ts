"use server";

import { revalidatePath } from "next/cache";
import { publishPageAction } from "@/lib/actions/publish";

export async function publishFromReviewAction(userId: string) {
  await publishPageAction(userId);
  revalidatePath("/admin/review");
}
