import { PERMISSIONS, type PermissionKey } from "@/lib/rbac";

export type AdminNavIconKey =
  | "users"
  | "shield"
  | "billing"
  | "auditlog"
  | "analytics"
  | "editor"
  | "messages"
  | "review"
  | "settings";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: AdminNavIconKey;
  permission?: PermissionKey;
  superAdminOnly?: boolean;
};

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin/users", label: "إدارة المستخدمين", icon: "users", permission: PERMISSIONS.USERS_MANAGE },
  { href: "/admin/sub-admins", label: "المشرفون الفرعيون", icon: "shield", superAdminOnly: true },
  {
    href: "/admin/subscriptions",
    label: "الاشتراكات والفوترة",
    icon: "billing",
    permission: PERMISSIONS.SUBSCRIPTIONS_MANAGE,
  },
  {
    href: "/admin/audit-log",
    label: "سجل التعديلات",
    icon: "auditlog",
    permission: PERMISSIONS.AUDIT_LOG_VIEW,
  },
  {
    href: "/admin/analytics",
    label: "التحليلات",
    icon: "analytics",
    permission: PERMISSIONS.ANALYTICS_VIEW,
  },
  {
    href: "/admin/editor",
    label: "تحرير نيابة عن مستخدم",
    icon: "editor",
    permission: PERMISSIONS.PROFILES_EDIT_ON_BEHALF,
  },
  { href: "/admin/messages", label: "الرسائل", icon: "messages", permission: PERMISSIONS.MESSAGES_SEND },
  {
    href: "/admin/review",
    label: "مراجعة ونشر التعديلات",
    icon: "review",
    permission: PERMISSIONS.CHANGES_REVIEW_PUBLISH,
  },
  { href: "/admin/settings", label: "الإعدادات العامة", icon: "settings", superAdminOnly: true },
];
