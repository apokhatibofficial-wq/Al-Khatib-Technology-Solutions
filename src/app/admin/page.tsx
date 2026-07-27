import { redirect } from "next/navigation";
import { ADMIN_NAV } from "@/app/admin/nav-config";
import { requireAdmin } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

export default async function AdminIndexPage() {
  const user = await requireAdmin();

  const firstAvailable = ADMIN_NAV.find((item) => {
    if (item.superAdminOnly) return user.role === "SUPER_ADMIN";
    if (item.permission) return hasPermission(user, item.permission);
    return true;
  });

  if (firstAvailable) {
    redirect(firstAvailable.href);
  }

  return (
    <div className="mx-auto max-w-md py-20 text-center text-sub">
      لا تملك أي صلاحيات مفعّلة بعد. يرجى التواصل مع المشرف العام.
    </div>
  );
}
