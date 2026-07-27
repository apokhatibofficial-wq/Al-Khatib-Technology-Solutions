import { notFound, redirect } from "next/navigation";
import { PublishBar } from "@/components/profile-editor/publish-bar";
import { ProductsManager } from "@/components/profile-editor/products-manager";
import { PageHeader } from "@/components/page-header";
import { getEditablePageByUsername } from "@/lib/editable-page";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";

export const metadata = { title: "المنتجات والفئات" };

export default async function EditorProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  await requirePermission(PERMISSIONS.PROFILES_EDIT_ON_BEHALF);
  const { username } = await params;
  const page = await getEditablePageByUsername(username);
  if (!page) notFound();
  if (page.type !== "BUSINESS" || !page.businessProfile) redirect(`/admin/editor/${username}`);

  const { category } = await searchParams;

  return (
    <div>
      <PageHeader title="المنتجات والفئات" />
      <PublishBar
        userId={page.userId}
        slug={page.slug}
        published={page.published}
        hasUnpublishedChanges={page.hasUnpublishedChanges}
      />
      <ProductsManager
        userId={page.userId}
        page={page.businessProfile}
        basePath={`/admin/editor/${username}/products`}
        activeCategoryId={category}
      />
    </div>
  );
}
