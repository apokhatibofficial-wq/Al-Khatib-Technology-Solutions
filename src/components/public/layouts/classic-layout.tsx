import { ImageIcon } from "lucide-react";
import { ContactButtonsRow } from "@/components/public/contact-buttons-row";
import { CouponBanner } from "@/components/public/coupon-banner";
import { ProductContactAction } from "@/components/public/product-contact-action";
import { Watermark } from "@/components/public/watermark";
import { groupProductsByCategory, type PublicPageSnapshot } from "@/lib/page-snapshot";

export function ClassicLayout({
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
  const coverUrl = isBusiness ? snapshot.business!.coverUrl : snapshot.individual!.coverUrl;

  return (
    <div className="public-card-shadow w-full max-w-[420px] overflow-hidden rounded-[32px] bg-white">
      {coupon && <CouponBanner coupon={coupon} />}

      <div
        className="bg-cover-gradient h-44 bg-cover bg-center"
        style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}
      />

      <div className="px-6 pb-8">
        <div
          className={`-mt-12 flex h-24 w-24 items-center justify-center border-4 border-white bg-brand-light ${
            isBusiness ? "rounded-2xl" : "rounded-full"
          }`}
          style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        >
          {!avatarUrl && <ImageIcon className="h-8 w-8 text-brand" />}
        </div>

        <div className="mt-3.5 text-2xl font-extrabold text-ink">{name}</div>
        {subtitle && <div className="mt-0.5 text-sm text-sub">{subtitle}</div>}
        {bio && <p className="mt-3.5 text-sm leading-7 text-sub">{bio}</p>}

        <div className="mt-5">
          <ContactButtonsRow buttons={snapshot.contactButtons} brandColor={snapshot.brandColor} />
        </div>

        {isBusiness && snapshot.business!.products.length > 0 && (
          <div className="mt-7 flex flex-col gap-5">
            <div className="text-sm font-extrabold text-ink">
              المنتجات ({snapshot.business!.products.length.toLocaleString("ar")})
            </div>
            {groupProductsByCategory(snapshot.business).map((group) => (
              <div key={group.category?.id ?? "uncategorized"}>
                {group.category && (
                  <div className="mb-2.5 text-xs font-extrabold text-brand">{group.category.name}</div>
                )}
                <div className="grid grid-cols-2 gap-2.5">
                  {group.products.map((product) => (
                    <div key={product.id} className="overflow-hidden rounded-xl bg-brand-light">
                      <div className="h-20 bg-[#dcecf9]">
                        {product.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5 p-2.5">
                        <div className="truncate text-xs font-bold text-ink">{product.name}</div>
                        <div className="text-xs font-bold" style={{ color: snapshot.brandColor }}>
                          {product.price} ل.س
                        </div>
                        <ProductContactAction
                          contactMode={product.contactMode}
                          contactValue={product.contactValue}
                          brandColor={snapshot.brandColor}
                        />
                      </div>
                    </div>
                  ))}
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
