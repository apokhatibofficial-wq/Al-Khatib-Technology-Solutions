import { Link2, Phone } from "lucide-react";

export function ProductContactAction({
  contactMode,
  contactValue,
  brandColor,
}: {
  contactMode: string;
  contactValue: string | null;
  brandColor: string;
}) {
  if (contactMode === "NONE" || !contactValue) return null;

  const isCall = contactMode === "CALL";
  const href = isCall ? `tel:${contactValue}` : contactValue;
  const Icon = isCall ? Phone : Link2;

  return (
    <a
      href={href}
      target={isCall ? undefined : "_blank"}
      rel={isCall ? undefined : "noreferrer"}
      className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
      style={{ backgroundColor: brandColor }}
    >
      <Icon className="h-3 w-3" />
      {isCall ? "اتصال" : "اطلب الآن"}
    </a>
  );
}
