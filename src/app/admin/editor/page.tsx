import { PenLine } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { SearchForm } from "@/components/search-form";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac";

export const metadata = { title: "تحرير نيابة عن مستخدم" };

export default async function EditorSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePermission(PERMISSIONS.PROFILES_EDIT_ON_BEHALF);
  const { q } = await searchParams;
  const search = q?.trim() ?? "";

  const users = search
    ? await prisma.user.findMany({
        where: {
          role: { in: ["INDIVIDUAL", "BUSINESS"] },
          OR: [
            { username: { contains: search, mode: "insensitive" } },
            { fullName: { contains: search, mode: "insensitive" } },
          ],
        },
        take: 20,
      })
    : [];

  return (
    <div>
      <PageHeader
        title="تحرير نيابة عن مستخدم"
        description="ابحث باليوزرنيم أو الاسم للوصول إلى لوحة تحكم أي حساب وتجهيز صفحته."
      />

      <SearchForm defaultValue={search} placeholder="بحث باليوزرنيم أو الاسم..." />

      {search && users.length === 0 && (
        <EmptyState icon={PenLine} title="لا نتائج مطابقة" description="تحقق من اليوزرنيم وحاول مجددًا." />
      )}

      {users.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {users.map((user) => (
            <Link
              key={user.id}
              href={`/admin/editor/${user.username}`}
              className="flex items-center justify-between rounded-xl border border-[#e7edf1] bg-white p-4 hover:border-brand"
            >
              <div>
                <div className="font-bold text-ink">{user.fullName}</div>
                <div className="text-xs text-sub" dir="ltr">
                  @{user.username}
                </div>
              </div>
              <span className="text-sm font-bold text-brand">فتح لوحة التحكم ←</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
