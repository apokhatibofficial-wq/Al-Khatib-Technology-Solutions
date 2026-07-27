import { ADMIN_NAV } from "@/app/admin/nav-config";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireAdmin } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  const items = ADMIN_NAV.filter((item) => {
    if (item.superAdminOnly) return user.role === "SUPER_ADMIN";
    if (item.permission) return hasPermission(user, item.permission);
    return true;
  });

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AdminSidebar items={items} title={user.fullName} />
      <AdminMobileNav items={items} title={user.fullName} />
      <main className="flex-1 bg-[#fbfcfd] p-5 sm:p-9">{children}</main>
    </div>
  );
}
