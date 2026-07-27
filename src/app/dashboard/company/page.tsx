import { notFound, redirect } from "next/navigation";
import { BusinessCompanyForm } from "@/components/profile-editor/business-company-form";
import { PublishBar } from "@/components/profile-editor/publish-bar";
import { PageHeader } from "@/components/page-header";
import { getEditablePageByUserId } from "@/lib/editable-page";
import { prisma } from "@/lib/prisma";
import { requireOwnCustomerAccount } from "@/lib/profile-access";

export const metadata = { title: "بيانات الشركة" };

export default async function CompanyPage() {
  const user = await requireOwnCustomerAccount();
  const page = await getEditablePageByUserId(user.id);
  if (!page) notFound();
  if (page.type !== "BUSINESS" || !page.businessProfile) redirect("/dashboard");

  const activityCategories = await prisma.activityCategory.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="بيانات الشركة" />
      <PublishBar
        userId={user.id}
        slug={page.slug}
        published={page.published}
        hasUnpublishedChanges={page.hasUnpublishedChanges}
        showCelebration
      />
      <div className="rounded-2xl border border-[#e7edf1] bg-white p-6">
        <BusinessCompanyForm
          userId={user.id}
          companyName={page.businessProfile.companyName}
          description={page.businessProfile.description}
          activityCategoryId={page.businessProfile.activityCategoryId}
          activityCategories={activityCategories}
          logoUrl={page.businessProfile.logoUrl}
        />
      </div>
    </div>
  );
}
