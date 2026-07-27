import { notFound } from "next/navigation";
import { ContactButtonsForm } from "@/components/profile-editor/contact-buttons-form";
import { PublishBar } from "@/components/profile-editor/publish-bar";
import { PageHeader } from "@/components/page-header";
import { getEditablePageByUserId } from "@/lib/editable-page";
import { requireOwnCustomerAccount } from "@/lib/profile-access";

export const metadata = { title: "أزرار التواصل" };

export default async function ContactButtonsPage() {
  const user = await requireOwnCustomerAccount();
  const page = await getEditablePageByUserId(user.id);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="أزرار التواصل" />
      <PublishBar
        userId={user.id}
        slug={page.slug}
        published={page.published}
        hasUnpublishedChanges={page.hasUnpublishedChanges}
        showCelebration
      />
      <div className="rounded-2xl border border-[#e7edf1] bg-white p-6">
        <ContactButtonsForm userId={user.id} buttons={page.contactButtons} showCustomLabel={page.type === "BUSINESS"} />
      </div>
    </div>
  );
}
