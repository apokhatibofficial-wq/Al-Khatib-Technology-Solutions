import { CreditCard } from "lucide-react";
import Link from "next/link";
import {
  renewCycleAction,
  setSubscriptionStatusAction,
  togglePageWatermarkAction,
} from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { SearchForm } from "@/components/search-form";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac";
import {
  cycleEndDate,
  daysRemainingInCycle,
  PAYMENT_STATUS_LABELS,
} from "@/lib/subscription";
import type { Prisma, PaymentStatus } from "@/generated/prisma/client";

export const metadata = { title: "الاشتراكات والفوترة" };

const STATUS_ORDER: PaymentStatus[] = ["PAID", "LATE", "UNPAID"];

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePermission(PERMISSIONS.SUBSCRIPTIONS_MANAGE);
  const { q } = await searchParams;
  const search = q?.trim() ?? "";

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

  const users = await prisma.user.findMany({
    where,
    include: { subscription: true, publicPage: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="الاشتراكات والفوترة" description="دورة اشتراك 30 يومًا لكل حساب" />

      <SearchForm defaultValue={search} placeholder="بحث بالاسم أو اسم المستخدم..." />

      {users.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={search ? "لا نتائج مطابقة" : "لا توجد اشتراكات بعد"}
          description={search ? "جرّب اسمًا آخر." : "ستظهر الاشتراكات هنا فور إضافة مستخدمين."}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {users.map((user) => {
            const sub = user.subscription;
            if (!sub) return null;
            const daysLeft = daysRemainingInCycle(sub.cycleStart, sub.cycleDays);
            const endDate = cycleEndDate(sub.cycleStart, sub.cycleDays);

            return (
              <div key={user.id} className="rounded-2xl border border-[#e7edf1] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Link href={`/admin/users/${user.id}`} className="font-bold text-ink hover:text-brand">
                      {user.fullName}
                    </Link>
                    <div className="text-xs text-sub" dir="ltr">
                      @{user.username}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm text-sub">
                    <span>
                      الدورة: {sub.cycleStart.toLocaleDateString("ar")} ← {endDate.toLocaleDateString("ar")}
                    </span>
                    <span
                      className={`font-bold ${daysLeft < 0 ? "text-danger" : daysLeft <= 5 ? "text-warning" : "text-success"}`}
                    >
                      {daysLeft < 0
                        ? `منتهية منذ ${Math.abs(daysLeft)} يوم`
                        : `${daysLeft.toLocaleString("ar")} يوم متبقٍ`}
                    </span>
                  </div>

                  <form action={renewCycleAction.bind(null, user.id)}>
                    <Button type="submit" size="sm" variant="secondary">
                      تجديد الدورة
                    </Button>
                  </form>
                </div>

                <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-[#f0f3f5] pt-3.5">
                  <span className="text-xs font-bold text-sub">الحالة:</span>
                  {STATUS_ORDER.map((status) => (
                    <form key={status} action={setSubscriptionStatusAction.bind(null, user.id, status)}>
                      <button type="submit">
                        <Badge
                          variant={
                            status === sub.status
                              ? status === "PAID"
                                ? "success"
                                : status === "LATE"
                                  ? "warning"
                                  : "danger"
                              : "neutral"
                          }
                          className={status === sub.status ? "" : "cursor-pointer opacity-60 hover:opacity-100"}
                        >
                          {PAYMENT_STATUS_LABELS[status]}
                        </Badge>
                      </button>
                    </form>
                  ))}

                  <span className="mx-2 h-4 w-px bg-[#e7edf1]" />

                  {user.publicPage && (
                    <form action={togglePageWatermarkAction.bind(null, user.id)}>
                      <button type="submit" className="text-xs font-bold text-brand hover:text-brand-deep">
                        {user.publicPage.showWatermark ? "إخفاء العلامة المائية" : "إظهار العلامة المائية"}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
