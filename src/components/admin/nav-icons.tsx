import {
  BarChart3,
  Bell,
  ClipboardList,
  CreditCard,
  PenLine,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AdminNavIconKey } from "@/app/admin/nav-config";

export const NAV_ICONS: Record<AdminNavIconKey, LucideIcon> = {
  users: Users,
  shield: ShieldCheck,
  billing: CreditCard,
  auditlog: ClipboardList,
  analytics: BarChart3,
  editor: PenLine,
  messages: Bell,
  review: ClipboardList,
  settings: Settings,
};
