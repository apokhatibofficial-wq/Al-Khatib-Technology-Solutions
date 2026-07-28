"use client";

import { ImageIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { CONTACT_KIND_META } from "@/components/public/contact-buttons-row";
import type { PublicPageSnapshot } from "@/lib/page-snapshot";

export function SplashScreen({
  imageUrl,
  logoUrl,
  companyName,
  durationSeconds,
  buttons,
  brandColor,
  children,
}: {
  imageUrl: string;
  logoUrl: string | null;
  companyName: string;
  durationSeconds: number;
  buttons: PublicPageSnapshot["contactButtons"];
  brandColor: string;
  children: React.ReactNode;
}) {
  const shouldReduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), durationSeconds * 1000);
    return () => clearTimeout(timer);
  }, [durationSeconds]);

  const primaryButton = buttons.find((b) => b.enabled && b.value);

  return (
    <>
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-end overflow-hidden px-6 pb-12 text-center"
          >
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${imageUrl})` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20" />

            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 16, delay: 0.1 }}
              className="relative z-10 mb-auto mt-20 flex h-24 w-24 items-center justify-center rounded-3xl border border-white/30 bg-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-md"
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-full w-full rounded-3xl object-cover" />
              ) : (
                <ImageIcon className="h-9 w-9 text-white" />
              )}
            </motion.div>

            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.3, duration: 0.5 }}
              className="relative z-10 flex flex-col items-center gap-4"
            >
              <h1 className="text-2xl font-black text-white">{companyName}</h1>

              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setVisible(false)}
                  className="rounded-full border border-white/40 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-sm"
                >
                  عرض المنتجات
                </button>
                {primaryButton &&
                  (() => {
                    const meta = CONTACT_KIND_META[primaryButton.kind];
                    if (!meta) return null;
                    const Icon = meta.icon;
                    return (
                      <a
                        href={meta.href(primaryButton.value!)}
                        target={primaryButton.kind === "CALL" ? undefined : "_blank"}
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-white shadow-lg"
                        style={{ backgroundColor: brandColor }}
                      >
                        <Icon className="h-4 w-4" />
                        {primaryButton.label || meta.label}
                      </a>
                    );
                  })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
