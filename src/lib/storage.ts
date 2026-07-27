import "server-only";
import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.S3_ENDPOINT &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY &&
      process.env.S3_BUCKET &&
      process.env.S3_PUBLIC_BASE_URL,
  );
}

function getClient(): S3Client {
  return new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });
}

const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB

export async function createPresignedUpload(params: {
  contentType: string;
  folder: string;
}): Promise<{ uploadUrl: string; publicUrl: string } | { error: string }> {
  if (!isStorageConfigured()) {
    return { error: "التخزين غير مُهيأ على الخادم. يرجى ضبط متغيّرات S3_* في إعدادات البيئة." };
  }
  if (!ALLOWED_CONTENT_TYPES.has(params.contentType)) {
    return { error: "نوع الملف غير مدعوم. الأنواع المسموحة: JPG, PNG, WEBP, GIF." };
  }

  const extension = params.contentType.split("/")[1];
  const key = `${params.folder}/${randomUUID()}.${extension}`;

  const client = getClient();
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: params.contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
  const publicUrl = `${process.env.S3_PUBLIC_BASE_URL!.replace(/\/$/, "")}/${key}`;

  return { uploadUrl, publicUrl };
}

export const MAX_UPLOAD_BYTES_CLIENT = MAX_UPLOAD_BYTES;
