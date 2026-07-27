import { ImageIcon } from "lucide-react";
import { ContactButtonsRow } from "@/components/public/contact-buttons-row";
import { CouponBanner } from "@/components/public/coupon-banner";
import { Watermark } from "@/components/public/watermark";
import type { PublicPageSnapshot } from "@/lib/page-snapshot";

export function ListLayout({
  snapshot,
  coupon,
  showWatermark,
}: {
  snapshot: PublicPageSnapshot;
  coupon: { title: string; color: string } | null;
  showWatermark: boolean;
}) {
  const isBusiness = snapshot.type === "BUSINESS";
  const name = isBusiness ? snapshot.business!.companyName : snapshot.individual!.displayName;
  const subtitle = isBusiness ? snapshot.business!.activityCategory : snapshot.individual!.profession;
  const bio = isBusiness ? snapshot.business!.description : snapshot.individual!.bio;
  const avatarUrl = isBusiness ? snapshot.business!.logoUrl ?? snapshot.business!.avatarUrl : snapshot.individual!.avatarUrl;

  return (
    <div className="public-card-shadow w-full max-w-[420px] overflow-hidden rounded-[32px] bg-white">
      {coupon && <CouponBanner coupon={coupon} />}

      <div className="flex items-center gap-4 p-6" style={{ backgroundColor: snapshot.brandColor }}>
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-white/40 bg-white/20"
          style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        >
          {!avatarUrl && <ImageIcon className="h-6 w-6 text-white" />}
        </div>
        <div>
          <div className="text-lg font-extrabold text-white">{name}</div>
          {subtitle && <div className="text-xs text-white/80">{subtitle}</div>}
        </div>
      </div>

      <div className="p-6">
        {bio && <p className="mb-5 text-sm leading-7 text-sub">{bio}</p>}

        <ContactButtonsRow buttons={snapshot.contactButtons} brandColor={snapshot.brandColor} />

        {isBusiness && snapshot.business!.products.length > 0 && (
          <div className="mt-6 flex flex-col gap-2.5">
            <div className="text-sm font-extrabold text-ink">
              المنتجات ({snapshot.business!.products.length.toLocaleString("ar")})
            </div>
            {snapshot.business!.products.map((product) => (
              <div key={product.id} className="flex items-center gap-3 rounded-xl border border-[#f0f3f5] p-2.5">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-brand-light">
                  {product.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-ink">{product.name}</div>
                </div>
                <div className="shrink-0 text-sm font-bold" style={{ color: snapshot.brandColor }}>
                  {product.price} ل.س
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showWatermark && <Watermark />}
    </div>
  );
}
