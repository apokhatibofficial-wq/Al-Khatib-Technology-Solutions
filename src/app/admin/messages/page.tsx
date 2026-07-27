import { Bell } from "lucide-react";
import { ComposeNotificationForm } from "./compose-notification-form";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac";

export const metadata = { title: "الرسائل والإشعارات" };

export default async function MessagesPage() {
  await requirePermission(PERMISSIONS.MESSAGES_SEND);

  const sent = await prisma.notification.findMany({
    include: { _count: { select: { recipients: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="الرسائل والإشعارات" description="إرسال إشعار لمستخدم واحد أو عدة مستخدمين أو للجميع" />

      <ComposeNotificationForm />

      <div className="mt-8">
        <div className="mb-3 text-sm font-extrabold text-ink">آخر الرسائل المُرسلة</div>
        {sent.length === 0 ? (
          <EmptyState icon={Bell} title="لم يتم إرسال أي رسالة بعد" />
        ) : (
          <div className="flex flex-col gap-2">
            {sent.map((n) => (
              <div key={n.id} className="rounded-xl border border-[#e7edf1] bg-white p-3.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-ink">{n.title}</span>
                  <span className="text-xs text-sub">
                    {n.broadcast ? "للجميع" : `${n._count.recipients.toLocaleString("ar")} مستلم`}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-sub">{n.body}</p>
                <div className="mt-1 text-[11px] text-sub">
                  {n.createdAt.toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
