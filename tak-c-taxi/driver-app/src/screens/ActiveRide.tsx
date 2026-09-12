import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapView } from "../components/MapView";
import { useGeolocation } from "../hooks/useGeolocation";
import { getRide, markArrived, startTrip, endTrip, startWaiting, stopWaiting, type Ride } from "../api/rides";
import { Button } from "../components/Button";

const ACTION_BY_STATE: Record<string, { label: string; next: (id: string, point: { lat: number; lng: number }) => Promise<{ id: string; state: string }> }> = {
  DRIVER_ARRIVING: { label: "وصلت لمكان الركوب", next: markArrived },
  DRIVER_ARRIVED: { label: "ابدأ الرحلة", next: startTrip },
  WAITING: { label: "متابعة الرحلة", next: stopWaiting },
};

export function ActiveRide() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { position } = useGeolocation();
  const [ride, setRide] = useState<Ride | null>(null);
  const [busy, setBusy] = useState(false);
  const [invoice, setInvoice] = useState<{ totalCents: number; currency: string; distanceM: number; waitingS: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void getRide(id).then(setRide).catch(() => {});
  }, [id]);

  async function handleStep() {
    if (!id || !ride) return;
    const action = ACTION_BY_STATE[ride.state];
    if (!action) return;
    setError(null);
    setBusy(true);
    try {
      const updated = await action.next(id, position);
      setRide((r) => (r ? { ...r, state: updated.state } : r));
    } catch {
      setError("تعذرت العملية، حاول مرة تانية");
    } finally {
      setBusy(false);
    }
  }

  async function handleStartWaiting() {
    if (!id) return;
    setError(null);
    setBusy(true);
    try {
      const updated = await startWaiting(id, position);
      setRide((r) => (r ? { ...r, state: updated.state } : r));
    } catch {
      setError("تعذرت العملية");
    } finally {
      setBusy(false);
    }
  }

  async function handleEnd() {
    if (!id) return;
    setError(null);
    setBusy(true);
    try {
      const result = await endTrip(id, position);
      setInvoice(result.invoice);
      setRide((r) => (r ? { ...r, state: result.state } : r));
    } catch {
      setError("تعذر إنهاء الرحلة");
    } finally {
      setBusy(false);
    }
  }

  if (!ride) return null;

  if (ride.state === "TRIP_COMPLETED") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl">✅</div>
        <h1 className="text-xl font-bold">انتهت الرحلة</h1>
        {invoice && (
          <div className="rounded-2xl border-2 border-yellow bg-cream-soft p-5">
            <span className="block text-3xl font-extrabold">
              {(invoice.totalCents / 100).toFixed(2)} {invoice.currency}
            </span>
            <span className="mt-2 block text-sm text-ink-soft">{(invoice.distanceM / 1000).toFixed(1)} كم</span>
          </div>
        )}
        <Button onClick={() => navigate("/")}>رجوع للرئيسية</Button>
      </div>
    );
  }

  const action = ACTION_BY_STATE[ride.state];

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <MapView center={position} markers={[{ point: position }]} className="absolute inset-0" />
      <div className="absolute inset-x-4 bottom-6 space-y-3 rounded-2xl bg-cream-soft p-5 shadow-lg">
        <p className="text-sm text-ink-soft">إلى: {ride.destLabel}</p>
        {error && <p className="text-sm text-red-600">{error}</p>}

        {ride.state === "TRIP_STARTED" && (
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => void handleStartWaiting()} disabled={busy} className="flex-1">
              ابدأ الانتظار
            </Button>
            <Button onClick={() => void handleEnd()} disabled={busy} className="flex-1">
              {busy ? "..." : "إنهاء الرحلة"}
            </Button>
          </div>
        )}

        {action && (
          <Button onClick={() => void handleStep()} disabled={busy}>
            {busy ? "..." : action.label}
          </Button>
        )}
      </div>
    </div>
  );
}
