import { Bell, Paperclip } from "lucide-react";
import { markNotificationReadAction } from "@/lib/actions/notifications";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { requireOwnCustomerAccount } from "@/lib/profile-access";
import { cn } from "@/lib/utils";

export const metadata = { title: "الإشعارات" };

export default async function NotificationsPage() {
  const user = await requireOwnCustomerAccount();

  const receipts = await prisma.notificationRecipient.findMany({
    where: { userId: user.id },
    include: { notification: { include: { sender: { select: { fullName: true } } } } },
    orderBy: { notification: { createdAt: "desc" } },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="الإشعارات" />

      {receipts.length === 0 ? (
        <EmptyState icon={Bell} title="لا توجد إشعارات بعد" description="ستظهر هنا أي رسالة يرسلها فريق الإدارة." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {receipts.map((receipt) => {
            const notification = receipt.notification;
            const unread = !receipt.readAt;
            return (
              <form key={receipt.id} action={markNotificationReadAction.bind(null, notification.id)}>
                <button
                  type="submit"
                  className={cn(
                    "w-full rounded-2xl border p-4 text-start transition-colors",
                    unread ? "border-brand/30 bg-brand-light" : "border-[#e7edf1] bg-white",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-extrabold text-ink">{notification.title}</span>
                    {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-sub">{notification.body}</p>
                  {notification.attachmentUrl && (
                    <a
                      href={notification.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:text-brand-deep"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      {notification.attachmentKind === "IMAGE" ? "عرض الصورة المرفقة" : "تنزيل الملف المرفق"}
                    </a>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-sub">
                    <span>من</span>
                    <bdi>{notification.sender.fullName}</bdi>
                    <span>—</span>
                    <bdi>
                      {notification.createdAt.toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" })}
                    </bdi>
                  </div>
                </button>
              </form>
            );
          })}
        </div>
      )}
    </div>
  );
}
