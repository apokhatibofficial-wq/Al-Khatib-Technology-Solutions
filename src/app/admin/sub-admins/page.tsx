import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { AddSubAdminDialog } from "./add-sub-admin-dialog";
import { toggleSubAdminActiveAction } from "./actions";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSION_LABELS, isPermissionKey } from "@/lib/rbac";

export const metadata = { title: "المشرفون الفرعيون" };

export default async function SubAdminsPage() {
  await requireSuperAdmin();

  const subAdmins = await prisma.user.findMany({
    where: { role: "SUB_ADMIN" },
    include: { permissions: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="المشرفون الفرعيون"
        description="إنشاء حسابات مشرفين بصلاحيات محددة بدقة"
        action={<AddSubAdminDialog />}
      />

      {subAdmins.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="لا يوجد مشرفون فرعيون بعد"
          description="أضف أول مشرف فرعي وحدد صلاحياته من زر (إضافة مشرف فرعي)."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {subAdmins.map((admin) => (
            <div
              key={admin.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e7edf1] bg-white p-4"
              style={{ opacity: admin.active ? 1 : 0.5 }}
            >
              <div>
                <Link href={`/admin/sub-admins/${admin.id}`} className="font-bold text-ink hover:text-brand">
                  {admin.fullName}
                </Link>
                <div className="text-xs text-sub" dir="ltr">
                  @{admin.username}
                </div>
              </div>
              <div className="flex flex-1 flex-wrap gap-1.5">
                {admin.permissions.length === 0 ? (
                  <span className="text-xs text-sub">بلا صلاحيات بعد</span>
                ) : (
                  admin.permissions
                    .filter((p) => isPermissionKey(p.key))
                    .map((p) => (
                      <Badge key={p.id} variant="neutral">
                        {PERMISSION_LABELS[p.key as keyof typeof PERMISSION_LABELS]}
                      </Badge>
                    ))
                )}
              </div>
              <form action={toggleSubAdminActiveAction.bind(null, admin.id)}>
                <button
                  type="submit"
                  className={`cursor-pointer text-sm font-bold ${admin.active ? "text-danger" : "text-success"}`}
                >
                  {admin.active ? "تعطيل" : "تفعيل"}
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
