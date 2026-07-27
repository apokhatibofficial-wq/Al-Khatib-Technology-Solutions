import { notFound } from "next/navigation";
import { EditSubAdminForm } from "./edit-sub-admin-form";
import { toggleSubAdminActiveAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "تعديل مشرف فرعي" };

export default async function EditSubAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;

  const admin = await prisma.user.findUnique({
    where: { id },
    include: { permissions: true },
  });

  if (!admin || admin.role !== "SUB_ADMIN") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={admin.fullName}
        description={`@${admin.username}`}
        action={
          <form action={toggleSubAdminActiveAction.bind(null, admin.id)}>
            <Button type="submit" size="sm" variant={admin.active ? "danger" : "primary"}>
              {admin.active ? "تعطيل الحساب" : "تفعيل الحساب"}
            </Button>
          </form>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>تعديل البيانات والصلاحيات</CardTitle>
        </CardHeader>
        <CardContent>
          <EditSubAdminForm
            subAdminId={admin.id}
            fullName={admin.fullName}
            grantedPermissions={admin.permissions.map((p) => p.key)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
