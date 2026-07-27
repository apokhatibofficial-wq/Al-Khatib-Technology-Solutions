import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditUserForm } from "./edit-user-form";
import { toggleUserActiveAction } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac";
import { PAYMENT_STATUS_LABELS } from "@/lib/subscription";

export const metadata = { title: "تعديل مستخدم" };

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(PERMISSIONS.USERS_MANAGE);
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: { subscription: true, publicPage: true },
  });

  if (!user || (user.role !== "INDIVIDUAL" && user.role !== "BUSINESS")) {
    notFound();
  }

  const status = user.subscription?.status ?? "UNPAID";

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={user.fullName} description={`@${user.username}`} />

      <Card className="mb-5">
        <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-3 p-5 text-sm">
          <div>
            <div className="text-xs text-sub">النوع</div>
            <div className="font-bold">{user.role === "INDIVIDUAL" ? "فرد" : "شركة"}</div>
          </div>
          <div>
            <div className="text-xs text-sub">حالة الاشتراك</div>
            <Badge variant={status === "PAID" ? "success" : status === "LATE" ? "warning" : "danger"}>
              {PAYMENT_STATUS_LABELS[status]}
            </Badge>
          </div>
          <div>
            <div className="text-xs text-sub">تاريخ الإنشاء</div>
            <div className="font-bold">{user.createdAt.toLocaleDateString("ar")}</div>
          </div>
          {user.publicPage && (
            <div>
              <div className="text-xs text-sub">الصفحة العامة</div>
              <a
                href={`/u/${user.publicPage.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-bold text-brand hover:text-brand-deep"
              >
                فتح <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
          <div className="ms-auto">
            <form action={toggleUserActiveAction.bind(null, user.id)}>
              <Button type="submit" size="sm" variant={user.active ? "danger" : "primary"}>
                {user.active ? "تعطيل الحساب" : "تفعيل الحساب"}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>تعديل البيانات</CardTitle>
        </CardHeader>
        <CardContent>
          <EditUserForm
            userId={user.id}
            fullName={user.fullName}
            phone={user.phone ?? ""}
            location={user.location ?? ""}
          />
        </CardContent>
      </Card>

      <div className="mt-5 flex flex-wrap gap-4 text-sm">
        <Link href={`/admin/subscriptions?q=${encodeURIComponent(user.username)}`} className="font-bold text-brand hover:text-brand-deep">
          إدارة الاشتراك ←
        </Link>
        <Link href={`/admin/analytics?q=${encodeURIComponent(user.username)}`} className="font-bold text-brand hover:text-brand-deep">
          عرض التحليلات ←
        </Link>
        <Link href={`/admin/editor/${user.username}`} className="font-bold text-brand hover:text-brand-deep">
          تحرير الصفحة نيابة عنه ←
        </Link>
      </div>
    </div>
  );
}
