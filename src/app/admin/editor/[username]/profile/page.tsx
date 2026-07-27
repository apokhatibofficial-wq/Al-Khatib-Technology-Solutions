import { notFound, redirect } from "next/navigation";
import { IndividualProfileForm } from "@/components/profile-editor/individual-profile-form";
import { PublishBar } from "@/components/profile-editor/publish-bar";
import { PageHeader } from "@/components/page-header";
import { getEditablePageByUsername } from "@/lib/editable-page";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "الملف الأساسي" };

export default async function EditorProfilePage({ params }: { params: Promise<{ username: string }> }) {
  await requirePermission(PERMISSIONS.PROFILES_EDIT_ON_BEHALF);
  const { username } = await params;
  const page = await getEditablePageByUsername(username);
  if (!page) notFound();
  if (page.type !== "INDIVIDUAL" || !page.individualProfile) redirect(`/admin/editor/${username}`);

  const professions = await prisma.profession.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="الملف الأساسي" />
      <PublishBar
        userId={page.userId}
        slug={page.slug}
        published={page.published}
        hasUnpublishedChanges={page.hasUnpublishedChanges}
      />
      <div className="rounded-2xl border border-[#e7edf1] bg-white p-6">
        <IndividualProfileForm
          userId={page.userId}
          displayName={page.individualProfile.displayName}
          bio={page.individualProfile.bio}
          professionId={page.individualProfile.professionId}
          professions={professions}
          avatarUrl={page.individualProfile.avatarUrl}
          coverUrl={page.individualProfile.coverUrl}
        />
      </div>
    </div>
  );
}
