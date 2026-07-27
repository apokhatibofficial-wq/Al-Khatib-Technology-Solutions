import "server-only";
import * as QRCode from "qrcode";

export function getPublicPageUrl(slug: string, source?: "qr"): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const url = `${base.replace(/\/$/, "")}/u/${slug}`;
  return source ? `${url}?src=${source}` : url;
}

export async function generateQrPngBuffer(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: "png",
    width: 512,
    margin: 2,
    color: { dark: "#073b66", light: "#ffffff" },
  });
}
