import { notFound } from "next/navigation";
import { getDashboardNav } from "@/app/dashboard/nav-config";
import { DashboardMobileNav } from "@/components/dashboard/dashboard-mobile-nav";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { getEditablePageByUserId } from "@/lib/editable-page";
import { requireOwnCustomerAccount } from "@/lib/profile-access";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOwnCustomerAccount();
  const page = await getEditablePageByUserId(user.id);
  if (!page) notFound();

  const items = getDashboardNav(user.role);
  const title = page.type === "BUSINESS" ? page.businessProfile?.companyName ?? user.fullName : "لوحتي";

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <DashboardSidebar items={items} title={title} />
      <DashboardMobileNav items={items} title={title} />
      <main className="flex-1 bg-[#fbfcfd] p-5 sm:p-9">{children}</main>
    </div>
  );
}
