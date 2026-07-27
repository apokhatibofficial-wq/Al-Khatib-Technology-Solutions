import { ClipboardList, ExternalLink } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac";

const PAGE_SIZE = 30;

export const metadata = { title: "سجل التعديلات" };

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requirePermission(PERMISSIONS.AUDIT_LOG_VIEW);
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      include: {
        actor: { select: { fullName: true, username: true } },
        targetUser: { select: { fullName: true, publicPage: { select: { slug: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader title="سجل التعديلات" description="كل التعديلات على الحسابات، من المستخدمين أو من فريق الإدارة" />

      {entries.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="لا توجد تعديلات مسجّلة بعد"
          description="سيظهر هنا كل تعديل يقوم به فريق الإدارة على الحسابات."
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e7edf1] bg-white px-4 py-3.5 text-sm"
            >
              <div>
                <span className="font-bold text-ink">{entry.actor.fullName}</span>
                <span className="text-sub"> — {entry.summary}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-sub">
                  {entry.createdAt.toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" })}
                </span>
                {entry.targetUser?.publicPage && (
                  <a
                    href={`/u/${entry.targetUser.publicPage.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:text-brand-deep"
                  >
                    فتح صفحة {entry.targetUser.fullName} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/audit-log?page=${p}`}
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
