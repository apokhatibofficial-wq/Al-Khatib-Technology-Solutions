import type { Role } from "@/generated/prisma/client";

/**
 * Permission catalog for sub-admins (spec §4.2: "نظام الصلاحيات قابل للتوسعة").
 * Each key maps 1:1 to one of the independent admin capabilities in §4.3–§4.8.
 * Super admins bypass this catalog entirely (full access by role).
 * Sub-admin management itself is intentionally NOT a grantable permission —
 * only a Super Admin may create sub-admins or change their grants, so a
 * sub-admin can never escalate their own or another sub-admin's access.
 */
export const PERMISSIONS = {
  USERS_MANAGE: "users.manage",
  SUBSCRIPTIONS_MANAGE: "subscriptions.manage",
  AUDIT_LOG_VIEW: "auditlog.view",
  ANALYTICS_VIEW: "analytics.view",
  PROFILES_EDIT_ON_BEHALF: "profiles.edit_on_behalf",
  MESSAGES_SEND: "messages.send",
  CHANGES_REVIEW_PUBLISH: "changes.review_publish",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  [PERMISSIONS.USERS_MANAGE]: "إدارة المستخدمين",
  [PERMISSIONS.SUBSCRIPTIONS_MANAGE]: "الاشتراكات والفوترة",
  [PERMISSIONS.AUDIT_LOG_VIEW]: "سجل التعديلات",
  [PERMISSIONS.ANALYTICS_VIEW]: "التحليلات",
  [PERMISSIONS.PROFILES_EDIT_ON_BEHALF]: "تحرير الملفات نيابة عن المستخدم",
  [PERMISSIONS.MESSAGES_SEND]: "الرسائل والإشعارات",
  [PERMISSIONS.CHANGES_REVIEW_PUBLISH]: "مراجعة ونشر التعديلات",
};

export const PERMISSION_DESCRIPTIONS: Record<PermissionKey, string> = {
  [PERMISSIONS.USERS_MANAGE]: "إضافة مستخدمين جدد وتعديل بياناتهم وتعطيل/تفعيل حساباتهم",
  [PERMISSIONS.SUBSCRIPTIONS_MANAGE]: "تعديل حالة الدفع لكل حساب والتحكم بإعدادات العلامة المائية",
  [PERMISSIONS.AUDIT_LOG_VIEW]: "الاطّلاع على سجل كل التعديلات التي أجراها المستخدمون",
  [PERMISSIONS.ANALYTICS_VIEW]: "الاطّلاع على إحصاءات الزيارات والتعديلات لكل حساب",
  [PERMISSIONS.PROFILES_EDIT_ON_BEHALF]: "البحث عن أي حساب وتعديل صفحته نيابة عنه",
  [PERMISSIONS.MESSAGES_SEND]: "إرسال إشعارات لمستخدم واحد أو عدة مستخدمين أو للجميع",
  [PERMISSIONS.CHANGES_REVIEW_PUBLISH]: "مراجعة تعديلات المستخدمين المعلّقة ونشرها",
};

export const ALL_PERMISSION_KEYS: PermissionKey[] = Object.values(PERMISSIONS);

export function isPermissionKey(value: string): value is PermissionKey {
  return (ALL_PERMISSION_KEYS as string[]).includes(value);
}

export function hasPermission(
  user: { role: Role; permissions: string[] },
  key: PermissionKey,
): boolean {
  if (user.role === "SUPER_ADMIN") return true;
  if (user.role !== "SUB_ADMIN") return false;
  return user.permissions.includes(key);
}

export function isAdminRole(role: Role): boolean {
  return role === "SUPER_ADMIN" || role === "SUB_ADMIN";
}

export function isCustomerRole(role: Role): boolean {
  return role === "INDIVIDUAL" || role === "BUSINESS";
}
