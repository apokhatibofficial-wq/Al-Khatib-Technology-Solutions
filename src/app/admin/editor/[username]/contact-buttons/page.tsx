import { notFound } from "next/navigation";
import { ContactButtonsForm } from "@/components/profile-editor/contact-buttons-form";
import { PublishBar } from "@/components/profile-editor/publish-bar";
import { PageHeader } from "@/components/page-header";
import { getEditablePageByUsername } from "@/lib/editable-page";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";

export const metadata = { title: "أزرار التواصل" };

export default async function EditorContactButtonsPage({ params }: { params: Promise<{ username: string }> }) {
  await requirePermission(PERMISSIONS.PROFILES_EDIT_ON_BEHALF);
  const { username } = await params;
  const page = await getEditablePageByUsername(username);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="أزرار التواصل" />
      <PublishBar
        userId={page.userId}
        slug={page.slug}
        published={page.published}
        hasUnpublishedChanges={page.hasUnpublishedChanges}
      />
      <div className="rounded-2xl border border-[#e7edf1] bg-white p-6">
        <ContactButtonsForm userId={page.userId} buttons={page.contactButtons} showCustomLabel={page.type === "BUSINESS"} />
      </div>
    </div>
  );
}
