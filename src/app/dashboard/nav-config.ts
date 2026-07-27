import type { Role } from "@/generated/prisma/client";

export type DashboardNavIconKey =
  | "profile"
  | "company"
  | "contact"
  | "appearance"
  | "products"
  | "coupons"
  | "notifications";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: DashboardNavIconKey;
};

type NavSegment = { segment: string; label: string; icon: DashboardNavIconKey };

const BUSINESS_SEGMENTS: NavSegment[] = [
  { segment: "company", label: "بيانات الشركة", icon: "company" },
  { segment: "appearance", label: "الهوية البصرية", icon: "appearance" },
  { segment: "contact-buttons", label: "أزرار التواصل", icon: "contact" },
  { segment: "products", label: "المنتجات والفئات", icon: "products" },
  { segment: "coupons", label: "الكوبونات والعروض", icon: "coupons" },
  { segment: "notifications", label: "الإشعارات", icon: "notifications" },
];

const INDIVIDUAL_SEGMENTS: NavSegment[] = [
  { segment: "profile", label: "الملف الأساسي", icon: "profile" },
  { segment: "contact-buttons", label: "أزرار التواصل", icon: "contact" },
  { segment: "appearance", label: "التخصيص البصري", icon: "appearance" },
  { segment: "notifications", label: "الإشعارات", icon: "notifications" },
];

export function getDashboardNav(
  role: Role,
  options?: { basePath?: string; includeNotifications?: boolean },
): DashboardNavItem[] {
  const basePath = options?.basePath ?? "/dashboard";
  const includeNotifications = options?.includeNotifications ?? true;

  const segments = role === "BUSINESS" ? BUSINESS_SEGMENTS : INDIVIDUAL_SEGMENTS;

  return segments
    .filter((s) => includeNotifications || s.icon !== "notifications")
    .map((s) => ({ href: `${basePath}/${s.segment}`, label: s.label, icon: s.icon }));
}
