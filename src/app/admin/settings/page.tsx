import { toggleGlobalWatermarkAction } from "@/app/admin/subscriptions/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "الإعدادات العامة" };

export default async function AdminSettingsPage() {
  await requireSuperAdmin();

  const settings = await prisma.systemSetting.upsert({
    where: { id: "global" },
    create: { id: "global" },
    update: {},
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="الإعدادات العامة" description="إعدادات تنطبق على المنصة بالكامل" />

      <Card>
        <CardHeader>
          <CardTitle>العلامة المائية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <p className="max-w-md text-sm leading-6 text-sub">
              عند التفعيل، تظهر علامة شركة الخطيب للحلول التقنية على الصفحات العامة للحسابات التي
              تركت خيار العلامة المائية مفعّلًا (يمكن تخصيص كل حساب على حدة من صفحة الاشتراكات).
              عند التعطيل هنا، تختفي العلامة من كل الصفحات فورًا بغضّ النظر عن إعداد كل حساب.
            </p>
            <form action={toggleGlobalWatermarkAction}>
              <Button type="submit" variant={settings.watermarkEnabledGlobally ? "danger" : "primary"}>
                {settings.watermarkEnabledGlobally ? "تعطيل العلامة المائية عالميًا" : "تفعيل العلامة المائية عالميًا"}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
