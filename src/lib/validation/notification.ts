import { z } from "zod";

export const notificationSchema = z.object({
  title: z.string().trim().min(1, "العنوان مطلوب").max(160),
  body: z.string().trim().min(1, "نص الرسالة مطلوب").max(2000),
  recipientMode: z.enum(["single", "multiple", "all"]),
  recipientIds: z.array(z.string()).optional(),
  attachmentUrl: z.string().trim().optional().or(z.literal("")),
  attachmentKind: z.enum(["NONE", "IMAGE", "FILE"]).optional(),
});
