import { NextResponse } from "next/server";
import { generateQrPngBuffer, getPublicPageUrl } from "@/lib/qr";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = getPublicPageUrl(slug, "qr");
  const buffer = await generateQrPngBuffer(url);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
      "Content-Disposition": `inline; filename="${slug}-qr.png"`,
    },
  });
}
