import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { getCurrentUser, isSetupComplete } from "@/lib/auth";
import { isAdminRole } from "@/lib/rbac";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "تسجيل الدخول",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (!(await isSetupComplete())) {
    redirect("/setup");
  }

  const user = await getCurrentUser();
  if (user) {
    redirect(isAdminRole(user.role) ? "/admin" : "/dashboard");
  }

  const { next } = await searchParams;

  return (
    <AuthShell subtitle="تسجيل الدخول إلى لوحة التحكم">
      <LoginForm next={next} />
    </AuthShell>
  );
}
