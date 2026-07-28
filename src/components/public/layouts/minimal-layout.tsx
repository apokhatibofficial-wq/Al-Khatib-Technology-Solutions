import { ImageIcon } from "lucide-react";
import { ContactButtonsRow } from "@/components/public/contact-buttons-row";
import { CouponBanner } from "@/components/public/coupon-banner";
import { ProductContactAction } from "@/components/public/product-contact-action";
import { Watermark } from "@/components/public/watermark";
import { groupProductsByCategory, type PublicPageSnapshot } from "@/lib/page-snapshot";

export function MinimalLayout({
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

      <div className="flex flex-col items-center px-8 pb-8 pt-10 text-center">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-light"
          style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        >
          {!avatarUrl && <ImageIcon className="h-7 w-7 text-brand" />}
        </div>

        <div className="mt-4 text-xl font-extrabold text-ink">{name}</div>
        {subtitle && (
          <div className="mt-1 text-xs font-bold uppercase tracking-wide" style={{ color: snapshot.brandColor }}>
            {subtitle}
          </div>
        )}
        {bio && <p className="mt-3 text-sm leading-6 text-sub">{bio}</p>}

        <div className="mt-5 w-full">
          <ContactButtonsRow buttons={snapshot.contactButtons} brandColor={snapshot.brandColor} />
        </div>

        {isBusiness && snapshot.business!.products.length > 0 && (
          <div className="mt-6 w-full text-start">
            <div className="mb-2 text-center text-xs font-bold text-sub">
              {snapshot.business!.products.length.toLocaleString("ar")} منتج
            </div>
            <div className="flex flex-col gap-3">
              {groupProductsByCategory(snapshot.business).map((group) => (
                <div key={group.category?.id ?? "uncategorized"}>
                  {group.category && (
                    <div className="mb-1 text-xs font-extrabold text-brand">{group.category.name}</div>
                  )}
                  <div className="flex flex-col divide-y divide-[#f0f3f5]">
                    {group.products.map((product) => (
                      <div key={product.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                        <span className="min-w-0 flex-1 truncate text-ink">{product.name}</span>
                        <span className="shrink-0 font-bold" style={{ color: snapshot.brandColor }}>
                          {product.price} ل.س
                        </span>
                        <ProductContactAction
                          contactMode={product.contactMode}
                          contactValue={product.contactValue}
                          brandColor={snapshot.brandColor}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showWatermark && <Watermark />}
    </div>
  );
}
