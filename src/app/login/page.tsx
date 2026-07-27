import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { getCurrentUser, isSetupComplete } from "@/lib/auth";
import { isAdminRole } from "@/lib/rbac";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "تسجيل الدخول",
};

// Must never be statically cached: the isSetupComplete()/getCurrentUser()
// checks below depend on live DB state, but if the build-time render takes
// the isSetupComplete() branch it returns before ever touching cookies() —
// the one call Next's dynamic-rendering heuristic would otherwise detect on
// its own. Without this, a build against a freshly-migrated empty database
// freezes this page as a permanent static redirect to /setup.
export const dynamic = "force-dynamic";

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
