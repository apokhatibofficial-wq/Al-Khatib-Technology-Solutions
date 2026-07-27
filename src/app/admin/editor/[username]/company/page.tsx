import { notFound, redirect } from "next/navigation";
import { BusinessCompanyForm } from "@/components/profile-editor/business-company-form";
import { PublishBar } from "@/components/profile-editor/publish-bar";
import { PageHeader } from "@/components/page-header";
import { getEditablePageByUsername } from "@/lib/editable-page";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "بيانات الشركة" };

export default async function EditorCompanyPage({ params }: { params: Promise<{ username: string }> }) {
  await requirePermission(PERMISSIONS.PROFILES_EDIT_ON_BEHALF);
  const { username } = await params;
  const page = await getEditablePageByUsername(username);
  if (!page) notFound();
  if (page.type !== "BUSINESS" || !page.businessProfile) redirect(`/admin/editor/${username}`);

  const activityCategories = await prisma.activityCategory.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="بيانات الشركة" />
      <PublishBar
        userId={page.userId}
        slug={page.slug}
        published={page.published}
        hasUnpublishedChanges={page.hasUnpublishedChanges}
      />
      <div className="rounded-2xl border border-[#e7edf1] bg-white p-6">
        <BusinessCompanyForm
          userId={page.userId}
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
