import { ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDashboardNav } from "@/app/dashboard/nav-config";
import { DashboardMobileNav } from "@/components/dashboard/dashboard-mobile-nav";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { getEditablePageByUsername } from "@/lib/editable-page";
import { requireAdmin } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";

export default async function EditorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
}) {
  const admin = await requireAdmin();
  // Viewing this screen is allowed for either the full "edit on behalf" (§4.6)
  // or the narrower "review & publish" (§4.8) permission — saving individual
  // fields still requires §4.6 at the action level.
  if (
    !hasPermission(admin, PERMISSIONS.PROFILES_EDIT_ON_BEHALF) &&
    !hasPermission(admin, PERMISSIONS.CHANGES_REVIEW_PUBLISH)
  ) {
    redirect("/admin");
  }
  const { username } = await params;

  const page = await getEditablePageByUsername(username);
  if (!page) notFound();

  const basePath = `/admin/editor/${username}`;
  const items = getDashboardNav(page.type, { basePath, includeNotifications: false });
  const title = page.type === "BUSINESS" ? page.businessProfile?.companyName ?? page.user.fullName : page.user.fullName;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <DashboardSidebar items={items} title={title} hideLogout />
      <DashboardMobileNav items={items} title={title} hideLogout />
      <main className="flex-1 bg-[#fbfcfd] p-5 sm:p-9">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-warning/10 px-4 py-3 text-sm font-bold text-warning">
          <span>أنت تحرر الآن نيابةً عن: {page.user.fullName} (@{page.user.username})</span>
          <Link href="/admin/editor" className="inline-flex items-center gap-1 text-brand hover:text-brand-deep">
            <ArrowRight className="h-4 w-4" />
            رجوع للبحث
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}
