import { notFound, redirect } from "next/navigation";
import { CouponsManager } from "@/components/profile-editor/coupons-manager";
import { PageHeader } from "@/components/page-header";
import { getEditablePageByUsername } from "@/lib/editable-page";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";

export const metadata = { title: "الكوبونات والعروض" };

export default async function EditorCouponsPage({ params }: { params: Promise<{ username: string }> }) {
  await requirePermission(PERMISSIONS.PROFILES_EDIT_ON_BEHALF);
  const { username } = await params;
  const page = await getEditablePageByUsername(username);
  if (!page) notFound();
  if (page.type !== "BUSINESS" || !page.businessProfile) redirect(`/admin/editor/${username}`);

  return (
    <div>
      <PageHeader title="الكوبونات والعروض" />
      <CouponsManager userId={page.userId} coupons={page.businessProfile.coupons} />
    </div>
  );
}
