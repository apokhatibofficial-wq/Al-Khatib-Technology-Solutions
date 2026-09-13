import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { TaxiCarIcon, StopwatchIcon, DriverCapIcon } from "../components/BrandIcons";

// Shown once, right after a brand-new account finishes registration (see
// Login.tsx — only when verifyOtp reports isNewUser) — never on a
// returning login. No skip: these 3 things (service area, the waiting
// counter, rating the driver) are ones the design board calls out as
// worth making sure every new rider actually sees before their first ride.
const SLIDES = [
  { Icon: TaxiCarIcon, iconSize: 230, title: "انت في سوريا", text: "تكسي خدمة محلية بتشتغل بمدينتك بإدلب — سواقين من المنطقة عارفين الطرقات منيح" },
  { Icon: StopwatchIcon, iconSize: 120, title: "عداد وقت الانتظار", text: "لو طلبت من السائق يوقف وينتظرك بمشوار — مثلاً عند محل — في عداد بيحسب وقت الانتظار وبينضاف بلطف عالفاتورة" },
  { Icon: DriverCapIcon, iconSize: 120, title: "يمكنكم تقييم السائق", text: "بعد كل رحلة رح تقدر تقيّم السواق — تقييمك بيساعدنا نحافظ على جودة الخدمة" },
];

export function Onboarding() {
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);

  function next() {
    if (slide < SLIDES.length - 1) setSlide(slide + 1);
    else navigate("/", { replace: true });
  }

  const { Icon, iconSize, title, text } = SLIDES[slide]!;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-between px-6 py-10">
      <div />
      <div className="flex flex-col items-center gap-6 text-center">
        <Icon size={iconSize} />
        <h2 className="font-display text-2xl font-extrabold text-green">{title}</h2>
        <p className="max-w-xs text-ink-soft">{text}</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <div className="flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <span key={i} className={`h-2 w-2 rounded-full ${i === slide ? "bg-yellow" : "bg-border"}`} />
          ))}
        </div>
        <Button onClick={next}>{slide === SLIDES.length - 1 ? "يلا نبدأ" : "التالي"}</Button>
      </div>
    </div>
  );
}
