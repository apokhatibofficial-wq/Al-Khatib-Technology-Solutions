import { notFound, redirect } from "next/navigation";
import { PublishBar } from "@/components/profile-editor/publish-bar";
import { ProductsManager } from "@/components/profile-editor/products-manager";
import { PageHeader } from "@/components/page-header";
import { getEditablePageByUserId } from "@/lib/editable-page";
import { requireOwnCustomerAccount } from "@/lib/profile-access";

export const metadata = { title: "المنتجات والفئات" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const user = await requireOwnCustomerAccount();
  const page = await getEditablePageByUserId(user.id);
  if (!page) notFound();
  if (page.type !== "BUSINESS" || !page.businessProfile) redirect("/dashboard");

  const { category } = await searchParams;

  return (
    <div>
      <PageHeader title="المنتجات والفئات" />
      <PublishBar
        userId={user.id}
        slug={page.slug}
        published={page.published}
        hasUnpublishedChanges={page.hasUnpublishedChanges}
      />
      <ProductsManager
        userId={user.id}
        page={page.businessProfile}
        basePath="/dashboard/products"
        activeCategoryId={category}
      />
    </div>
  );
}
