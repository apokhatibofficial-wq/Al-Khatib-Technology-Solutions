import { notFound } from "next/navigation";
import { AppearanceForm } from "@/components/profile-editor/appearance-form";
import { PublishBar } from "@/components/profile-editor/publish-bar";
import { PageHeader } from "@/components/page-header";
import { getEditablePageByUsername } from "@/lib/editable-page";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";

export const metadata = { title: "الهوية البصرية" };

export default async function EditorAppearancePage({ params }: { params: Promise<{ username: string }> }) {
  await requirePermission(PERMISSIONS.PROFILES_EDIT_ON_BEHALF);
  const { username } = await params;
  const page = await getEditablePageByUsername(username);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={page.type === "BUSINESS" ? "الهوية البصرية" : "التخصيص البصري"} />
      <PublishBar
        userId={page.userId}
        slug={page.slug}
        published={page.published}
        hasUnpublishedChanges={page.hasUnpublishedChanges}
      />
      <div className="rounded-2xl border border-[#e7edf1] bg-white p-6">
        <AppearanceForm userId={page.userId} brandColor={page.brandColor} layoutTemplate={page.layoutTemplate} />
      </div>
    </div>
  );
}
