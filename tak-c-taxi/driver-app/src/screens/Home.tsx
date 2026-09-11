import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapView } from "../components/MapView";
import { useGeolocation } from "../hooks/useGeolocation";
import { useDriverSocket } from "../hooks/useDriverSocket";
import { useAuth } from "../contexts/AuthContext";
import { setOnline, sendLocation } from "../api/driver";
import { acceptRide, declineRide } from "../api/rides";
import { Button } from "../components/Button";

// §6's 2-8s cadence — 5s picked as a documented default in that range, not
// specified further by the doc.
const LOCATION_SEND_INTERVAL_MS = 5000;

export function Home({ driverId, initialOnline }: { driverId: string; initialOnline: boolean }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { position } = useGeolocation();
  const [online, setOnlineState] = useState(initialOnline);
  const [busy, setBusy] = useState(false);
  const { offer, clearOffer } = useDriverSocket(online ? driverId : null);
  const [countdown, setCountdown] = useState(0);
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (!online) return;
    const now = Date.now();
    if (now - lastSentRef.current < LOCATION_SEND_INTERVAL_MS) return;
    lastSentRef.current = now;
    void sendLocation([{ lat: position.lat, lng: position.lng, accuracyM: 20, deviceTs: new Date().toISOString() }]).catch(() => {});
  }, [online, position]);

  useEffect(() => {
    if (!offer) return;
    setCountdown(Math.round(offer.expiresInMs / 1000));
    const interval = setInterval(() => {
      setCountdown((c) => {
        // The server's own 20s offer timer is authoritative (assignment.ts)
        // — this just hides a stale card once it's almost certainly moved
        // on to the next driver, rather than trying to be a second clock.
        if (c <= 1) clearOffer();
        return Math.max(0, c - 1);
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer]);

  async function toggleOnline() {
    setBusy(true);
    try {
      const { online: next } = await setOnline(!online);
      setOnlineState(next);
    } finally {
      setBusy(false);
    }
  }

  async function handleAccept() {
    if (!offer) return;
    const rideId = offer.rideId;
    clearOffer();
    try {
      await acceptRide(rideId);
      navigate(`/ride/${rideId}`);
    } catch {
      // Someone else won it first (409) — the card is already gone; driver
      // just stays online waiting for the next offer.
    }
  }

  async function handleDecline() {
    if (!offer) return;
    const rideId = offer.rideId;
    clearOffer();
    await declineRide(rideId).catch(() => {});
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <MapView center={position} className="absolute inset-0" />

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

        <button
          type="button"
          onClick={() => void toggleOnline()}
          disabled={busy}
          className={`pointer-events-auto rounded-xl px-4 py-2.5 text-sm font-bold shadow-md disabled:opacity-60 ${
            online ? "bg-yellow text-ink" : "bg-ink text-cream"
          }`}
        >
          {online ? "متصل — اضغط للإيقاف" : "غير متصل — اضغط للبدء"}
        </button>
      </div>

      {offer && (
        <div className="absolute inset-x-4 bottom-6 space-y-3 rounded-2xl border-2 border-yellow bg-cream-soft p-5 shadow-lg">
          <div className="flex items-center justify-between text-sm text-ink-soft">
            <span className="font-bold">طلب جديد</span>
            <span>{countdown} ث</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-ink-soft">من: {offer.pickupLabel}</p>
            <p className="text-sm text-ink-soft">إلى: {offer.destLabel}</p>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold">{(offer.fareCents / 100).toFixed(2)}</span>
            <span className="text-sm text-ink-soft">
              {(offer.distanceM / 1000).toFixed(1)} كم · {Math.round(offer.durationS / 60)} دقيقة
            </span>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => void handleDecline()} className="flex-1">
              رفض
            </Button>
            <Button onClick={() => void handleAccept()} className="flex-1">
              قبول
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
