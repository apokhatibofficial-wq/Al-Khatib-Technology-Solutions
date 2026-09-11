import { useState } from "react";
import { applyToDrive } from "../api/driver";
import { ApiError } from "../api/client";
import { Button } from "../components/Button";
import { Input } from "../components/Input";

export function Apply({ onApplied }: { onApplied: () => void }) {
  const [age, setAge] = useState("");
  const [type, setType] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [plate, setPlate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await applyToDrive({
        age: Number(age),
        vehicle: { type, model, color, plate },
      });
      onApplied();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذر إرسال الطلب، حاول مرة تانية");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col gap-6 px-5 py-8">
      <h1 className="text-xl font-bold">صير سواق عنا</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input type="number" min={18} max={100} required placeholder="عمرك" value={age} onChange={(e) => setAge(e.target.value)} />
        <Input required placeholder="نوع السيارة (مثال: كيا بيكانتو)" value={type} onChange={(e) => setType(e.target.value)} />
        <Input required placeholder="موديل السيارة" value={model} onChange={(e) => setModel(e.target.value)} />
        <Input required placeholder="لون السيارة" value={color} onChange={(e) => setColor(e.target.value)} />
        <Input required placeholder="رقم اللوحة" value={plate} onChange={(e) => setPlate(e.target.value)} dir="ltr" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? "..." : "إرسال الطلب"}
        </Button>
      </form>
    </div>
  );
}
