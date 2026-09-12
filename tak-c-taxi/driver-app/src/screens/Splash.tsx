import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

export function Splash() {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate("/login", { replace: true })}
      className="flex min-h-dvh cursor-pointer flex-col items-center justify-center gap-6 px-6"
    >
      <img src={logo} alt="تكسي" className="w-64" />
      <p className="text-ink-soft">للسواقين — اضغط للمتابعة</p>
    </div>
  );
}
