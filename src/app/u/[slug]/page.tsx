import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClassicLayout } from "@/components/public/layouts/classic-layout";
import { ListLayout } from "@/components/public/layouts/list-layout";
import { MinimalLayout } from "@/components/public/layouts/minimal-layout";
import { PremiumLayout } from "@/components/public/layouts/premium-layout";
import { SplashScreen } from "@/components/public/splash-screen";
import { VisitTracker } from "@/components/public/visit-tracker";
import { prisma } from "@/lib/prisma";
import type { PublicPageSnapshot } from "@/lib/page-snapshot";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await prisma.publicPage.findUnique({ where: { slug } });
  const snapshot = page?.publishedSnapshot as PublicPageSnapshot | null;
  const title = snapshot
    ? snapshot.type === "BUSINESS"
      ? snapshot.business?.companyName
      : snapshot.individual?.displayName
    : "إدلب.com";

  return { title: title || "إدلب.com" };
}

export default async function PublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ src?: string }>;
}) {
  const { slug } = await params;
  const { src } = await searchParams;

  const page = await prisma.publicPage.findUnique({ where: { slug } });
  if (!page) notFound();

  const snapshot = page.publishedSnapshot as unknown as PublicPageSnapshot | null;

  if (!page.published || !snapshot) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#eef2f5] px-6 text-center">
        <div className="text-2xl font-black text-brand-deep">
          إدلب<span className="text-brand">.com</span>
        </div>
        <p className="max-w-xs text-sm text-sub">لم يتم نشر هذه الصفحة بعد.</p>
      </div>
    );
  }

  const coupon =
    snapshot.type === "BUSINESS"
      ? await prisma.coupon.findFirst({
          where: {
            business: { pageId: page.id },
            published: true,
            AND: [
              { OR: [{ startDate: null }, { startDate: { lte: new Date() } }] },
              { OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
            ],
          },
          orderBy: { createdAt: "desc" },
          select: { title: true, color: true },
        })
      : null;

  const source: "LINK" | "QR" = src === "qr" ? "QR" : "LINK";
  const showWatermark = snapshot.showWatermark && (await isWatermarkGloballyEnabled());

  const LayoutComponent =
    snapshot.layoutTemplate === "premium" && snapshot.type === "BUSINESS"
      ? PremiumLayout
      : snapshot.layoutTemplate === "list"
        ? ListLayout
        : snapshot.layoutTemplate === "minimal"
          ? MinimalLayout
          : ClassicLayout;

  const content = (
    <div className="flex min-h-screen flex-col items-center bg-[#eef2f5] px-4 py-10">
      <VisitTracker slug={slug} source={source} />
      <LayoutComponent snapshot={snapshot} coupon={coupon} showWatermark={showWatermark} />
    </div>
  );

  if (snapshot.type === "BUSINESS" && snapshot.business?.splashEnabled && snapshot.business.splashImageUrl) {
    return (
      <SplashScreen
        imageUrl={snapshot.business.splashImageUrl}
        logoUrl={snapshot.business.logoUrl ?? snapshot.business.avatarUrl}
        companyName={snapshot.business.companyName}
        durationSeconds={snapshot.business.splashDurationSeconds}
        buttons={snapshot.contactButtons}
        brandColor={snapshot.brandColor}
      >
        {content}
      </SplashScreen>
    );
  }

  return content;
}

async function isWatermarkGloballyEnabled(): Promise<boolean> {
  const settings = await prisma.systemSetting.findUnique({ where: { id: "global" } });
  return settings?.watermarkEnabledGlobally ?? true;
}
