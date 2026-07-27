import { redirect } from "next/navigation";
import { getDashboardNav } from "@/app/dashboard/nav-config";
import { requireOwnCustomerAccount } from "@/lib/profile-access";

export default async function DashboardIndexPage() {
  const user = await requireOwnCustomerAccount();
  const [first] = getDashboardNav(user.role);
  redirect(first.href);
}
