import { notFound, redirect } from "next/navigation";
import { getDashboardNav } from "@/app/dashboard/nav-config";
import { getEditablePageByUsername } from "@/lib/editable-page";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";

export default async function EditorIndexPage({ params }: { params: Promise<{ username: string }> }) {
  await requirePermission(PERMISSIONS.PROFILES_EDIT_ON_BEHALF);
  const { username } = await params;
  const page = await getEditablePageByUsername(username);
  if (!page) notFound();

  const [first] = getDashboardNav(page.type, {
    basePath: `/admin/editor/${username}`,
    includeNotifications: false,
  });
  redirect(first.href);
}
