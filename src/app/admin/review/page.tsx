import { ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { publishFromReviewAction } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac";

export const metadata = { title: "مراجعة ونشر التعديلات" };

export default async function ReviewPage() {
  await requirePermission(PERMISSIONS.CHANGES_REVIEW_PUBLISH);

  const pendingPages = await prisma.publicPage.findMany({
    where: { hasUnpublishedChanges: true },
    include: { user: true },
    orderBy: { updatedAt: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="مراجعة ونشر التعديلات"
        description="الحسابات التي لديها تعديلات لم تُنشر بعد للجمهور"
      />

      {pendingPages.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="لا توجد تعديلات معلّقة"
          description="كل الحسابات منشورة بأحدث تعديلاتها حاليًا."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {pendingPages.map((page) => (
            <div
              key={page.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e7edf1] bg-white p-4"
            >
              <div>
                <div className="font-bold text-ink">{page.user.fullName}</div>
                <div className="text-xs text-sub" dir="ltr">
                  @{page.user.username}
                </div>
              </div>
              <Badge variant={page.published ? "warning" : "neutral"}>
                {page.published ? "تعديلات معلّقة على صفحة منشورة" : "لم يُنشر بعد"}
              </Badge>
              <div className="text-xs text-sub">
                آخر تعديل: {page.updatedAt.toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" })}
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/admin/editor/${page.user.username}`}
                  className="text-sm font-bold text-brand hover:text-brand-deep"
                >
                  مراجعة التفاصيل
                </Link>
                <form action={publishFromReviewAction.bind(null, page.userId)}>
                  <Button type="submit" size="sm">
                    نشر التعديلات
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
