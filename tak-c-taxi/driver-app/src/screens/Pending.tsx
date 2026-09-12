import type { DriverStatus } from "../api/driver";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/Button";

const MESSAGES: Record<Exclude<DriverStatus, "APPROVED">, { title: string; text: string }> = {
  PENDING: { title: "طلبك قيد المراجعة", text: "رح تقدر تشتغل سواق فور ما الإدارة توافق عطلبك." },
  REJECTED: { title: "للأسف ما تم قبول طلبك", text: "تواصل معنا إذا بتحب تعرف السبب." },
  SUSPENDED: { title: "حسابك موقوف حاليًا", text: "تواصل مع الإدارة لمعرفة التفاصيل." },
};

export function Pending({ status }: { status: Exclude<DriverStatus, "APPROVED"> }) {
  const { logout } = useAuth();
  const { title, text } = MESSAGES[status];

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-5xl">⏳</div>
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-ink-soft">{text}</p>
      <Button variant="ghost" onClick={() => void logout()}>
        تسجيل الخروج
      </Button>
    </div>
  );
}
