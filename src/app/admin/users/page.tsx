import { ExternalLink, Users as UsersIcon } from "lucide-react";
import Link from "next/link";
import { AddUserDialog } from "./add-user-dialog";
import { toggleUserActiveAction } from "./actions";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { SearchForm } from "@/components/search-form";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac";
import { PAYMENT_STATUS_LABELS } from "@/lib/subscription";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 20;

export const metadata = { title: "إدارة المستخدمين" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePermission(PERMISSIONS.USERS_MANAGE);

  const { q, page: pageParam } = await searchParams;
  const search = q?.trim() ?? "";
  const page = Math.max(1, Number(pageParam) || 1);

  const where: Prisma.UserWhereInput = {
    role: { in: ["INDIVIDUAL", "BUSINESS"] },
    ...(search ? { fullName: { contains: search, mode: "insensitive" } } : {}),
  };

  const [users, total, professions, activityCategories] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        subscription: true,
        publicPage: { include: { _count: { select: { visits: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
    prisma.profession.findMany({ orderBy: { name: "asc" } }),
    prisma.activityCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="إدارة المستخدمين"
        description={`${total.toLocaleString("ar")} حساب`}
        action={<AddUserDialog professions={professions} activityCategories={activityCategories} />}
      />

      <SearchForm defaultValue={search} placeholder="بحث بالاسم..." />

      {users.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={search ? "لا نتائج مطابقة" : "لا يوجد مستخدمون بعد"}
          description={
            search
              ? "جرّب اسمًا آخر أو امسح كلمة البحث."
              : "ابدأ بإضافة أول حساب فرد أو شركة من زر (إضافة مستخدم)."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#e7edf1] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="bg-[#f3f6f8] text-xs font-bold text-sub">
                  <th className="px-4 py-3 text-start">الاسم</th>
                  <th className="px-4 py-3 text-start">النوع</th>
                  <th className="px-4 py-3 text-start">الحالة</th>
                  <th className="px-4 py-3 text-start">الزيارات</th>
                  <th className="px-4 py-3 text-start">الصفحة</th>
                  <th className="px-4 py-3 text-start">الحساب</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const status = user.subscription?.status ?? "UNPAID";
                  return (
                    <tr
                      key={user.id}
                      className="border-t border-[#f0f3f5]"
                      style={{ opacity: user.active ? 1 : 0.45 }}
                    >
                      <td className="px-4 py-3.5">
                        <Link href={`/admin/users/${user.id}`} className="font-bold text-ink hover:text-brand">
                          {user.fullName}
                        </Link>
                        <div className="text-xs text-sub" dir="ltr">
                          @{user.username}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sub">
                        {user.role === "INDIVIDUAL" ? "فرد" : "شركة"}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          variant={status === "PAID" ? "success" : status === "LATE" ? "warning" : "danger"}
                        >
                          {PAYMENT_STATUS_LABELS[status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-sub">
                        {(user.publicPage?._count.visits ?? 0).toLocaleString("ar")}
                      </td>
                      <td className="px-4 py-3.5">
                        {user.publicPage && (
                          <a
                            href={`/u/${user.publicPage.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-brand hover:text-brand-deep"
                          >
                            فتح <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <form action={toggleUserActiveAction.bind(null, user.id)}>
                          <button
                            type="submit"
                            className={`cursor-pointer text-sm font-bold ${user.active ? "text-danger" : "text-success"}`}
                          >
                            {user.active ? "تعطيل" : "تفعيل"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/users?${new URLSearchParams({ ...(search ? { q: search } : {}), page: String(p) })}`}
              className={`flex h-8 w-8 items-center justify-center rounded-lg font-bold ${
                p === page ? "bg-brand text-white" : "bg-brand-light text-brand-deep"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
