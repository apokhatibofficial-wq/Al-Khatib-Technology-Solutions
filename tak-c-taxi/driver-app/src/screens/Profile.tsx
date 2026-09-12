import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { updateMe } from "../api/auth";
import { uploadFile, fileUrl } from "../api/uploads";
import { ApiError } from "../api/client";
import { Button } from "../components/Button";
import { Input } from "../components/Input";

export function Profile() {
  const navigate = useNavigate();
  const { user, refreshMe } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  async function handlePhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploadingPhoto(true);
    try {
      const { id } = await uploadFile(file);
      await updateMe({ photoFileId: id });
      await refreshMe();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذر رفع الصورة");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    try {
      await updateMe({ fullName, phone });
      await refreshMe();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذر الحفظ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col gap-6 px-5 py-6">
      <button type="button" onClick={() => navigate(-1)} className="self-start text-ink-soft">
        ← رجوع
      </button>

      <h1 className="text-xl font-bold">ملفي الشخصي</h1>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingPhoto}
          className="relative h-28 w-28 overflow-hidden rounded-full border-2 border-yellow bg-cream-soft"
        >
          {user.photoFileId ? (
            <img src={fileUrl(user.photoFileId)} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-3xl">👤</span>
          )}
          <span className="absolute inset-x-0 bottom-0 bg-ink/70 py-1 text-xs text-cream">
            {uploadingPhoto ? "..." : "تغيير"}
          </span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void handlePhotoPick(e)} />
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <Input placeholder="الاسم الكامل" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input type="tel" placeholder="رقم الموبايل" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="text-center" />
        <Input value={user.email} disabled dir="ltr" className="text-center opacity-60" />

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-700">تم الحفظ</p>}
        <Button type="submit" disabled={busy}>
          {busy ? "..." : "حفظ"}
        </Button>
      </form>
    </div>
  );
}
