import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import logo from "../assets/logo.png";

// Simple in-brand SVG icons standing in for the 3D-rendered slides in the
// shared design board (car / stopwatch / driver's cap) — those exact
// illustrations aren't available as reusable assets here, so these convey
// the same three value props (a real car, fast matching, vetted drivers)
// in the same cream/charcoal/yellow palette rather than approximating the
// renders pixel-for-pixel.
function CarIcon() {
  return (
    <svg width="120" height="120" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="11" width="20" height="7" rx="2" fill="#1f1f1f" />
      <path d="M5 11L7 6h10l2 5" stroke="#1f1f1f" strokeWidth="1.5" fill="none" />
      <circle cx="7" cy="18" r="2" fill="#f5c518" />
      <circle cx="17" cy="18" r="2" fill="#f5c518" />
    </svg>
  );
}
function StopwatchIcon() {
  return (
    <svg width="120" height="120" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="13" r="8" stroke="#1f1f1f" strokeWidth="1.5" fill="none" />
      <path d="M12 13V9M12 2h4M12 13l3 2" stroke="#f5c518" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function DriverIcon() {
  return (
    <svg width="120" height="120" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 15c0-4 3.5-7 8-7s8 3 8 7v2H4v-2Z"
        fill="#1f1f1f"
      />
      <rect x="9" y="16" width="6" height="2.5" rx="0.5" fill="#f5c518" />
    </svg>
  );
}

const SLIDES = [
  { Icon: CarIcon, title: "سيارتك جاية", text: "اطلب تكسي بضغطة زر ووصل لمكانك بأسرع وقت" },
  { Icon: StopwatchIcon, title: "سعر واضح من أول لحظة", text: "بتعرف السعر والمسافة قبل ما تأكد الطلب" },
  { Icon: DriverIcon, title: "سواقين موثوقين", text: "كل سواق موثق ومتابع من إدارة تكسي" },
];

export function Splash() {
  const navigate = useNavigate();
  const [slide, setSlide] = useState<number>(-1); // -1 = pure logo splash

  function next() {
    if (slide < SLIDES.length - 1) setSlide(slide + 1);
    else navigate("/login", { replace: true });
  }

  if (slide === -1) {
    return (
      <div
        onClick={() => setSlide(0)}
        className="flex min-h-dvh cursor-pointer flex-col items-center justify-center gap-6 px-6"
      >
        <img src={logo} alt="تكسي" className="w-64" />
      </div>
    );
  }

  const { Icon, title, text } = SLIDES[slide]!;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-between px-6 py-10">
      <div />
      <div className="flex flex-col items-center gap-6 text-center">
        <Icon />
        <h2 className="text-2xl font-extrabold">{title}</h2>
        <p className="max-w-xs text-ink-soft">{text}</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <div className="flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <span key={i} className={`h-2 w-2 rounded-full ${i === slide ? "bg-yellow" : "bg-border"}`} />
          ))}
        </div>
        <Button onClick={next}>{slide === SLIDES.length - 1 ? "ابدأ" : "التالي"}</Button>
        {slide < SLIDES.length - 1 && (
          <Button variant="ghost" onClick={() => navigate("/login", { replace: true })}>
            تخطي
          </Button>
        )}
      </div>
    </div>
  );
}
