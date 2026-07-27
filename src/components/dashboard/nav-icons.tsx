import { Bell, Contact, Image as ImageIcon, Package, Store, Tag, User, type LucideIcon } from "lucide-react";
import type { DashboardNavIconKey } from "@/app/dashboard/nav-config";

export const DASHBOARD_NAV_ICONS: Record<DashboardNavIconKey, LucideIcon> = {
  profile: User,
  company: Store,
  contact: Contact,
  appearance: ImageIcon,
  products: Package,
  coupons: Tag,
  notifications: Bell,
};
