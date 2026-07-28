"use client";

import { ImageIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { CONTACT_KIND_META } from "@/components/public/contact-buttons-row";
import { CouponBanner } from "@/components/public/coupon-banner";
import { ProductContactAction } from "@/components/public/product-contact-action";
import { Watermark } from "@/components/public/watermark";
import { groupProductsByCategory, type PublicPageSnapshot } from "@/lib/page-snapshot";

export function PremiumLayout({
  snapshot,
  coupon,
  showWatermark,
}: {
  snapshot: PublicPageSnapshot;
  coupon: { title: string; color: string } | null;
  showWatermark: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();
  const business = snapshot.business;
  if (!business) return null;

  const logoUrl = business.logoUrl ?? business.avatarUrl;
  const buttons = snapshot.contactButtons.filter((b) => b.enabled && b.value);
  const groups = groupProductsByCategory(business);

  const heroContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.12, delayChildren: shouldReduceMotion ? 0 : 0.15 } },
  };
  const heroItem = shouldReduceMotion
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : { hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0 } };

  return (
    <div className="w-full max-w-[560px] overflow-hidden rounded-[32px] bg-white public-card-shadow sm:max-w-2xl lg:max-w-3xl">
      {coupon && <CouponBanner coupon={coupon} />}

      {/* Hero / splash */}
      <div className="relative flex min-h-[420px] flex-col items-center justify-end overflow-hidden px-6 pb-9 pt-16 text-center sm:min-h-[480px]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: business.coverUrl
              ? `url(${business.coverUrl})`
              : `linear-gradient(160deg, ${snapshot.brandColor} 0%, #0a1622 130%)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 16, delay: 0.1 }}
          className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-white/30 bg-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-md sm:h-28 sm:w-28"
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-full w-full rounded-3xl object-cover" />
          ) : (
            <ImageIcon className="h-9 w-9 text-white" />
          )}
        </motion.div>

        <motion.div
          variants={heroContainer}
          initial="hidden"
          animate="visible"
          className="relative z-10 mt-5 flex flex-col items-center gap-2"
        >
          <motion.h1 variants={heroItem} className="text-2xl font-black text-white sm:text-3xl">
            {business.companyName}
          </motion.h1>

          {business.activityCategory && (
            <motion.span
              variants={heroItem}
              className="rounded-full px-3 py-1 text-xs font-bold text-white/90 backdrop-blur-sm"
              style={{ backgroundColor: `${snapshot.brandColor}55` }}
            >
              {business.activityCategory}
            </motion.span>
          )}

          {business.description && (
            <motion.p variants={heroItem} className="mt-1 max-w-md text-sm leading-7 text-white/85">
              {business.description}
            </motion.p>
          )}

          {buttons.length > 0 && (
            <motion.div variants={heroContainer} className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              {buttons.map((button, index) => {
                const meta = CONTACT_KIND_META[button.kind];
                if (!meta) return null;
                const Icon = meta.icon;
                const isPrimary = index === 0;
                return (
                  <motion.a
                    key={button.kind}
                    variants={heroItem}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.96 }}
                    href={meta.href(button.value!)}
                    target={button.kind === "CALL" ? undefined : "_blank"}
                    rel="noreferrer"
                    className={
                      isPrimary
                        ? "flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-lg"
                        : "flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-sm"
                    }
                    style={isPrimary ? { backgroundColor: snapshot.brandColor } : undefined}
                  >
                    <Icon className="h-4 w-4" />
                    {button.label || meta.label}
                  </motion.a>
                );
              })}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Categories & products */}
      {business.products.length > 0 && (
        <div className="px-6 py-8 sm:px-9">
          <div className="mb-6 flex items-center gap-2.5">
            <span className="h-6 w-1.5 rounded-full" style={{ backgroundColor: snapshot.brandColor }} />
            <h2 className="text-lg font-black text-ink">
              المنتجات <span className="font-bold text-sub">({business.products.length.toLocaleString("ar")})</span>
            </h2>
          </div>

          <div className="flex flex-col gap-8">
            {groups.map((group) => (
              <motion.div
                key={group.category?.id ?? "uncategorized"}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5 }}
              >
                {group.category && (
                  <div className="mb-3.5 text-sm font-extrabold" style={{ color: snapshot.brandColor }}>
                    {group.category.name}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {group.products.map((product) => (
                    <motion.div
                      key={product.id}
                      whileHover={shouldReduceMotion ? undefined : { y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col overflow-hidden rounded-2xl border border-[#eef1f4] bg-white shadow-[0_2px_10px_rgba(15,35,55,0.06)]"
                    >
                      <div className="aspect-square w-full bg-brand-light">
                        {product.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-2 p-3">
                        <div className="line-clamp-2 text-sm font-bold text-ink">{product.name}</div>
                        <div className="mt-auto flex items-center justify-between gap-2">
                          <span className="text-sm font-black" style={{ color: snapshot.brandColor }}>
                            {product.price} ل.س
                          </span>
                          <ProductContactAction
                            contactMode={product.contactMode}
                            contactValue={product.contactValue}
                            brandColor={snapshot.brandColor}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {showWatermark && <Watermark />}
    </div>
  );
}
