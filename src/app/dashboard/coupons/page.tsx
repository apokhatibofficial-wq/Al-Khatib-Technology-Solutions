import { notFound, redirect } from "next/navigation";
import { CouponsManager } from "@/components/profile-editor/coupons-manager";
import { PageHeader } from "@/components/page-header";
import { getEditablePageByUserId } from "@/lib/editable-page";
import { requireOwnCustomerAccount } from "@/lib/profile-access";

export const metadata = { title: "الكوبونات والعروض" };

export default async function CouponsPage() {
  const user = await requireOwnCustomerAccount();
  const page = await getEditablePageByUserId(user.id);
  if (!page) notFound();
  if (page.type !== "BUSINESS" || !page.businessProfile) redirect("/dashboard");

  return (
    <div>
      <PageHeader
        title="الكوبونات والعروض"
        description="تظهر الكوبونات المنشورة أعلى صفحتك العامة فورًا، بشكل مستقل عن نشر بقية التعديلات."
      />
      <CouponsManager userId={user.id} coupons={page.businessProfile.coupons} />
    </div>
  );
}
