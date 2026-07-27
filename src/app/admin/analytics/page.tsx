import { BarChart3 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 25;

const SORTS = {
  newest: "الأحدث",
  most_visited: "الأكثر زيارة",
  most_edited: "الأكثر تعديلًا",
} as const;

type SortKey = keyof typeof SORTS;

export const metadata = { title: "التحليلات" };

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  await requirePermission(PERMISSIONS.ANALYTICS_VIEW);
  const { q, sort: sortParam } = await searchParams;
  const search = q?.trim() ?? "";
  const sort: SortKey = sortParam && sortParam in SORTS ? (sortParam as SortKey) : "newest";

  const where: Prisma.UserWhereInput = {
    role: { in: ["INDIVIDUAL", "BUSINESS"] },
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { username: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.UserOrderByWithRelationInput =
    sort === "most_visited"
      ? { publicPage: { visits: { _count: "desc" } } }
      : sort === "most_edited"
        ? { auditLogsAsActor: { _count: "desc" } }
        : { createdAt: "desc" };

  const users = await prisma.user.findMany({
    where,
    include: {
      publicPage: { select: { id: true, slug: true, published: true } },
      _count: { select: { auditLogsAsActor: true } },
    },
    orderBy,
    take: PAGE_SIZE,
  });

  const pageIds = users.map((u) => u.publicPage?.id).filter((id): id is string => Boolean(id));

  const visitGroups = pageIds.length
    ? await prisma.visit.groupBy({
        by: ["pageId", "source"],
        where: { pageId: { in: pageIds } },
        _count: true,
      })
    : [];

  const visitsByPage = new Map<string, { link: number; qr: number }>();
  for (const group of visitGroups) {
    const entry = visitsByPage.get(group.pageId) ?? { link: 0, qr: 0 };
    if (group.source === "LINK") entry.link = group._count;
    else entry.qr = group._count;
    visitsByPage.set(group.pageId, entry);
  }

  return (
    <div>
      <PageHeader title="التحليلات" description="الزيارات والتعديلات لكل حساب" />

      <form method="GET" className="mb-5 flex flex-wrap gap-3">
        <Input name="q" defaultValue={search} placeholder="بحث بالاسم أو اسم المستخدم..." className="max-w-xs" />
        <Select name="sort" defaultValue={sort} className="max-w-[200px]">
          {Object.entries(SORTS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary">
          تطبيق
        </Button>
      </form>

      {users.length === 0 ? (
        <EmptyState icon={BarChart3} title="لا توجد بيانات بعد" description="ستظهر إحصاءات الزيارات هنا بعد نشر أول صفحة." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#e7edf1] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="bg-[#f3f6f8] text-xs font-bold text-sub">
                  <th className="px-4 py-3 text-start">الاسم</th>
                  <th className="px-4 py-3 text-start">زيارات الرابط</th>
                  <th className="px-4 py-3 text-start">زيارات QR</th>
                  <th className="px-4 py-3 text-start">إجمالي الزيارات</th>
                  <th className="px-4 py-3 text-start">عدد التعديلات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const visits = user.publicPage ? visitsByPage.get(user.publicPage.id) : undefined;
                  const link = visits?.link ?? 0;
                  const qr = visits?.qr ?? 0;
                  return (
                    <tr key={user.id} className="border-t border-[#f0f3f5]">
                      <td className="px-4 py-3.5">
                        <Link href={`/admin/users/${user.id}`} className="font-bold text-ink hover:text-brand">
                          {user.fullName}
                        </Link>
                        <div className="text-xs text-sub" dir="ltr">
                          @{user.username}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sub">{link.toLocaleString("ar")}</td>
                      <td className="px-4 py-3.5 text-sub">{qr.toLocaleString("ar")}</td>
                      <td className="px-4 py-3.5 font-bold text-ink">{(link + qr).toLocaleString("ar")}</td>
                      <td className="px-4 py-3.5 text-sub">{user._count.auditLogsAsActor.toLocaleString("ar")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
