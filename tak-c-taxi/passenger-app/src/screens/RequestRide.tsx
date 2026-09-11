import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { geocode, type GeocodeResult } from "../api/geo";
import { quoteRide, createRide, type Quote } from "../api/rides";
import { useGeolocation } from "../hooks/useGeolocation";
import { ApiError } from "../api/client";
import { Button } from "../components/Button";
import { Input } from "../components/Input";

type Step = "search" | "results" | "quote" | "requested";

export function RequestRide() {
  const navigate = useNavigate();
  const { position: pickup } = useGeolocation();
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [dest, setDest] = useState<GeocodeResult | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [rideId, setRideId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search only fires on submit (Enter / the button below), never per
  // keystroke — the public Nominatim instance's usage policy this backend
  // relies on explicitly forbids autocomplete-on-keystroke (see the
  // backend's "Address search via public Nominatim" README section).
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const { results } = await geocode(query);
      setResults(results);
      setStep("results");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذر البحث، حاول مرة تانية");
    } finally {
      setBusy(false);
    }
  }

  async function handlePickDest(place: GeocodeResult) {
    setDest(place);
    setError(null);
    setBusy(true);
    try {
      const q = await quoteRide({
        pickup,
        dest: { lat: place.lat, lng: place.lng },
        pickupLabel: "موقعي الحالي",
        destLabel: place.label,
      });
      setQuote(q);
      setStep("quote");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذر حساب السعر");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (!quote) return;
    setError(null);
    setBusy(true);
    try {
      const ride = await createRide(quote.quote_id);
      setRideId(ride.id);
      setStep("requested");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذر تأكيد الرحلة");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col gap-5 px-5 py-6">
      <button type="button" onClick={() => navigate(-1)} className="self-start text-ink-soft">
        ← رجوع
      </button>

      {step === "search" && (
        <form onSubmit={handleSearch} className="space-y-4">
          <h1 className="text-xl font-bold">وين رايح؟</h1>
          <Input
            autoFocus
            required
            placeholder="اكتب اسم المكان..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? "..." : "بحث"}
          </Button>
        </form>
      )}

      {step === "results" && (
        <div className="space-y-3">
          <h1 className="text-xl font-bold">اختر الوجهة</h1>
          {results.length === 0 && <p className="text-ink-soft">ما في نتائج، جرب كلمات تانية</p>}
          <ul className="space-y-2">
            {results.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => void handlePickDest(r)}
                  disabled={busy}
                  className="w-full rounded-2xl border border-border bg-cream-soft p-4 text-start disabled:opacity-50"
                >
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button variant="ghost" onClick={() => setStep("search")}>
            بحث تاني
          </Button>
        </div>
      )}

      {step === "quote" && quote && dest && (
        <div className="flex flex-1 flex-col justify-between">
          <div className="space-y-4">
            <h1 className="text-xl font-bold">تأكيد الرحلة</h1>
            <p className="text-ink-soft">إلى: {dest.label}</p>
            <div className="rounded-2xl border-2 border-yellow bg-cream-soft p-5 text-center">
              <span className="block text-4xl font-extrabold">
                {(quote.fare / 100).toFixed(2)} <span className="text-lg">{quote.currency}</span>
              </span>
              <span className="mt-2 block text-sm text-ink-soft">
                {(quote.distance_m / 1000).toFixed(1)} كم · {Math.round(quote.duration_s / 60)} دقيقة
              </span>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={handleConfirm} disabled={busy}>
            {busy ? "..." : "أكد الطلب"}
          </Button>
        </div>
      )}

      {step === "requested" && rideId && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="text-5xl">🚕</div>
          <h1 className="text-xl font-bold">طلبك وصل!</h1>
          <p className="text-ink-soft">عم نبحثلك عن سواق قريب منك...</p>
          <Button variant="ghost" onClick={() => navigate("/")}>
            رجوع للرئيسية
          </Button>
        </div>
      )}
    </div>
  );
}
