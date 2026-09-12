import { useState, useRef } from "react";
import { applyToDrive } from "../api/driver";
import { uploadFile, fileUrl } from "../api/uploads";
import { ApiError } from "../api/client";
import { Button } from "../components/Button";
import { Input } from "../components/Input";

export function Apply({ onApplied }: { onApplied: () => void }) {
  const [age, setAge] = useState("");
  const [type, setType] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [plate, setPlate] = useState("");
  const [photoFileId, setPhotoFileId] = useState<string | undefined>();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploadingPhoto(true);
    try {
      const { id } = await uploadFile(file);
      setPhotoFileId(id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذر رفع الصورة");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await applyToDrive({
        age: Number(age),
        vehicle: { type, model, color, plate, photoFileId },
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

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingPhoto}
          className="flex items-center gap-3 rounded-2xl border border-border bg-cream-soft p-3 text-start"
        >
          {photoFileId ? (
            <img src={fileUrl(photoFileId)} alt="" className="h-14 w-14 rounded-xl object-cover" />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-cream text-2xl">🚗</span>
          )}
          <span className="text-sm text-ink-soft">
            {uploadingPhoto ? "عم يرفع..." : photoFileId ? "تغيير صورة السيارة" : "صورة السيارة (اختياري)"}
          </span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void handlePhotoPick(e)} />

        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? "..." : "إرسال الطلب"}
        </Button>
      </form>
    </div>
  );
}
