import { Camera, Link2, MessageCircle, Phone, Send, Users } from "lucide-react";
import type { PublicPageSnapshot } from "@/lib/page-snapshot";

export const CONTACT_KIND_META: Record<string, { label: string; icon: typeof Phone; href: (value: string) => string }> = {
  CALL: { label: "اتصال", icon: Phone, href: (v) => `tel:${v}` },
  WHATSAPP: { label: "واتساب", icon: MessageCircle, href: (v) => `https://wa.me/${v.replace(/[^0-9]/g, "")}` },
  INSTAGRAM: { label: "إنستغرام", icon: Camera, href: (v) => (v.startsWith("http") ? v : `https://instagram.com/${v}`) },
  TELEGRAM: { label: "تيليجرام", icon: Send, href: (v) => (v.startsWith("http") ? v : `https://t.me/${v}`) },
  FACEBOOK: { label: "فيسبوك", icon: Users, href: (v) => v },
  CUSTOM_LINK: { label: "رابط", icon: Link2, href: (v) => v },
};

export function ContactButtonsRow({
  buttons,
  brandColor,
}: {
  buttons: PublicPageSnapshot["contactButtons"];
  brandColor: string;
}) {
  const active = buttons.filter((b) => b.enabled && b.value);
  if (active.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {active.map((button, index) => {
        const meta = CONTACT_KIND_META[button.kind];
        if (!meta) return null;
        const Icon = meta.icon;
        const label = button.label || meta.label;
        const isPrimary = index === 0;

        return (
          <a
            key={button.kind}
            href={meta.href(button.value!)}
            target={button.kind === "CALL" ? undefined : "_blank"}
            rel="noreferrer"
            className="flex min-w-[100px] flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-sm font-bold transition-opacity hover:opacity-90"
            style={isPrimary ? { backgroundColor: brandColor, color: "#fff" } : { backgroundColor: "#eaf4fc", color: "#073b66" }}
          >
            <Icon className="h-4 w-4" />
            {label}
          </a>
        );
      })}
    </div>
  );
}
