import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRide, downloadInvoice, type Ride } from "../api/rides";
import { ApiError } from "../api/client";
import { Button } from "../components/Button";

// No ride:{id} WS event carries state transitions yet (only driver
// location pings do — see realtime/broadcast.ts) — polling is the
// simple, real mechanism until that's built, not a stand-in for one.
const POLL_MS = 4000;

const STATUS_TEXT: Record<string, string> = {
  REQUESTED: "عم نجهز طلبك...",
  SEARCHING_DRIVER: "عم نبحثلك عن سواق قريب منك...",
  DRIVER_ACCEPTED: "لقينالك سواق! عم يجهز للانطلاق",
  DRIVER_ARRIVING: "السواق في الطريق إلك",
  DRIVER_ARRIVED: "السواق وصل لمكان الركوب",
  TRIP_STARTED: "الرحلة بدأت",
  WAITING: "السواق بينتظرك",
};

export function RideStatus() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ride, setRide] = useState<Ride | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const r = await getRide(id!);
        if (cancelled) return;
        setRide(r);
        if (r.state in STATUS_TEXT) {
          timer = setTimeout(() => void poll(), POLL_MS);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "تعذر تحميل حالة الرحلة");
      }
    }
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id]);

  async function handleDownload() {
    if (!id) return;
    setDownloadError(null);
    setDownloading(true);
    try {
      await downloadInvoice(id);
    } catch (err) {
      setDownloadError(err instanceof ApiError ? err.message : "تعذر تنزيل الفاتورة");
    } finally {
      setDownloading(false);
    }
  }

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-red-600">{error}</p>
        <Button onClick={() => navigate("/")}>رجوع للرئيسية</Button>
      </div>
    );
  }

  if (!ride) return null;

  if (ride.state === "TRIP_COMPLETED") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl">✅</div>
        <h1 className="text-xl font-bold">انتهت الرحلة</h1>
        {ride.invoice && (
          <div className="rounded-2xl border-2 border-yellow bg-cream-soft p-5">
            <span className="block text-3xl font-extrabold">
              {(ride.invoice.totalCents / 100).toFixed(2)} {ride.invoice.currency}
            </span>
            <span className="mt-2 block text-sm text-ink-soft">{(ride.invoice.distanceM / 1000).toFixed(1)} كم</span>
          </div>
        )}
        {downloadError && <p className="text-sm text-red-600">{downloadError}</p>}
        <Button variant="ghost" onClick={() => void handleDownload()} disabled={downloading}>
          {downloading ? "..." : "تنزيل الفاتورة PDF"}
        </Button>
        <Button onClick={() => navigate("/")}>رجوع للرئيسية</Button>
      </div>
    );
  }

  if (ride.state === "CANCELLED_BY_USER" || ride.state === "CANCELLED_BY_DRIVER") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl">✕</div>
        <h1 className="text-xl font-bold">تم إلغاء الرحلة</h1>
        <Button onClick={() => navigate("/")}>رجوع للرئيسية</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-5xl">🚕</div>
      <h1 className="text-xl font-bold">{STATUS_TEXT[ride.state] ?? "..."}</h1>
      <p className="text-ink-soft">إلى: {ride.destLabel}</p>
      <Button variant="ghost" onClick={() => navigate("/")}>
        رجوع للرئيسية
      </Button>
    </div>
  );
}
