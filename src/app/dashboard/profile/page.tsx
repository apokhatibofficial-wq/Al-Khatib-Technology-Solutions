import { notFound, redirect } from "next/navigation";
import { IndividualProfileForm } from "@/components/profile-editor/individual-profile-form";
import { PublishBar } from "@/components/profile-editor/publish-bar";
import { PageHeader } from "@/components/page-header";
import { getEditablePageByUserId } from "@/lib/editable-page";
import { prisma } from "@/lib/prisma";
import { requireOwnCustomerAccount } from "@/lib/profile-access";

export const metadata = { title: "الملف الأساسي" };

export default async function ProfilePage() {
  const user = await requireOwnCustomerAccount();
  const page = await getEditablePageByUserId(user.id);
  if (!page) notFound();
  if (page.type !== "INDIVIDUAL" || !page.individualProfile) redirect("/dashboard");

  const professions = await prisma.profession.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="الملف الأساسي" />
      <PublishBar
        userId={user.id}
        slug={page.slug}
        published={page.published}
        hasUnpublishedChanges={page.hasUnpublishedChanges}
        showCelebration
      />
      <div className="rounded-2xl border border-[#e7edf1] bg-white p-6">
        <IndividualProfileForm
          userId={user.id}
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
