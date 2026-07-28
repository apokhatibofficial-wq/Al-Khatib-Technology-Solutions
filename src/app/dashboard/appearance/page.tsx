import { notFound } from "next/navigation";
import { AppearanceForm } from "@/components/profile-editor/appearance-form";
import { PublishBar } from "@/components/profile-editor/publish-bar";
import { PageHeader } from "@/components/page-header";
import { getEditablePageByUserId } from "@/lib/editable-page";
import { requireOwnCustomerAccount } from "@/lib/profile-access";

export const metadata = { title: "التخصيص البصري" };

export default async function AppearancePage() {
  const user = await requireOwnCustomerAccount();
  const page = await getEditablePageByUserId(user.id);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={page.type === "BUSINESS" ? "الهوية البصرية" : "التخصيص البصري"} />
      <PublishBar
        userId={user.id}
        slug={page.slug}
        published={page.published}
        hasUnpublishedChanges={page.hasUnpublishedChanges}
        showCelebration
      />
      <div className="rounded-2xl border border-[#e7edf1] bg-white p-6">
        <AppearanceForm
          userId={user.id}
          brandColor={page.brandColor}
          layoutTemplate={page.layoutTemplate}
          accountType={page.type}
        />
      </div>
    </div>
  );
}
