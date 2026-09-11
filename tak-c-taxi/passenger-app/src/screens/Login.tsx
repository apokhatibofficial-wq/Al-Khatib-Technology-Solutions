import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { requestOtp } from "../api/auth";
import { ApiError } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import logo from "../assets/logo.png";

type Step = "email" | "code";

export function Login() {
  const navigate = useNavigate();
  const { verifyOtp, loading } = useAuth();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await requestOtp(email);
      setStep("code");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذر إرسال الكود، حاول مرة تانية");
    } finally {
      setSending(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await verifyOtp(email, code);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "الكود غير صحيح");
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-10">
      <img src={logo} alt="تكسي" className="w-56" />

      {step === "email" ? (
        <form onSubmit={handleRequestOtp} className="w-full max-w-sm space-y-4">
          <p className="text-center text-ink-soft">سجل دخول بإيميلك لنبدأ</p>
          <Input
            type="email"
            inputMode="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir="ltr"
            className="text-center"
          />
          {error && <p className="text-center text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={sending}>
            {sending ? "..." : "إرسال الكود"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="w-full max-w-sm space-y-4">
          <p className="text-center text-ink-soft">
            بعتنالك كود عالإيميل
            <br />
            <span dir="ltr" className="font-semibold text-ink">
              {email}
            </span>
          </p>
          <Input
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            placeholder="------"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            dir="ltr"
            className="text-center text-2xl tracking-[0.5em]"
            autoFocus
          />
          {error && <p className="text-center text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading || code.length !== 6}>
            {loading ? "..." : "تأكيد"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setStep("email")}>
            غير الإيميل
          </Button>
        </form>
      )}
    </div>
  );
}
