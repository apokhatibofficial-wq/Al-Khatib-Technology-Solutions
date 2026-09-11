import { useNavigate } from "react-router-dom";
import { useGeolocation } from "../hooks/useGeolocation";
import { MapView } from "../components/MapView";
import { useAuth } from "../contexts/AuthContext";

export function Home() {
  const navigate = useNavigate();
  const { position } = useGeolocation();
  const { logout } = useAuth();

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <MapView center={position} className="absolute inset-0" />

      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
        <div className="flex flex-col items-center">
          <span className="whitespace-nowrap rounded-full bg-ink px-3 py-1 text-xs font-bold text-cream shadow-md">
            أنت هنا
          </span>
          <svg width="20" height="24" viewBox="0 0 20 24" className="-mt-px">
            <path d="M10 24C10 24 20 13.5 20 10C20 4.5 15.5 0 10 0C4.5 0 0 4.5 0 10C0 13.5 10 24 10 24Z" fill="#1f1f1f" />
          </svg>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4">
        <button
          type="button"
          onClick={() => void logout()}
          aria-label="تسجيل الخروج"
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-cream shadow-md"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="absolute inset-x-4 bottom-6 space-y-3">
        <button
          type="button"
          onClick={() => navigate("/request")}
          className="w-full rounded-2xl bg-ink px-5 py-4 text-start text-cream shadow-lg"
        >
          <span className="block text-xs text-cream/70">وين رايح؟</span>
          <span className="block text-lg font-bold">اطلب تكسي</span>
        </button>
      </div>
    </div>
  );
}
