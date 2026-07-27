import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { isSetupComplete } from "@/lib/auth";
import { SetupForm } from "./setup-form";

export const metadata = {
  title: "الإعداد الأولي",
};

export default async function SetupPage() {
  if (await isSetupComplete()) {
    redirect("/login");
  }

  return (
    <AuthShell subtitle="الإعداد الأولي — إنشاء حساب المشرف العام">
      <SetupForm />
      <p className="mt-6 text-center text-xs leading-6 text-sub">
        تظهر هذه الصفحة مرة واحدة فقط طالما قاعدة البيانات فارغة. بعد إنشاء حساب المشرف العام لن
        تكون هذه الصفحة متاحة بعد الآن.
      </p>
    </AuthShell>
  );
}
