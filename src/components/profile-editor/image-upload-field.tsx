"use client";

import { ImageIcon, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

const MAX_BYTES = 8 * 1024 * 1024;

export function ImageUploadField({
  targetUserId,
  folder,
  currentUrl,
  onUploaded,
  shape = "square",
  label,
}: {
  targetUserId: string;
  folder: "avatars" | "covers" | "logos" | "products" | "splash";
  currentUrl?: string | null;
  onUploaded: (url: string) => unknown;
  shape?: "square" | "circle" | "wide";
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>();
  const [previewUrl, setPreviewUrl] = useState<string | null | undefined>(currentUrl);

  async function handleFile(file: File) {
    setError(undefined);
    if (file.size > MAX_BYTES) {
      setError("حجم الملف كبير جدًا (الحد الأقصى 8MB)");
      return;
    }

    setIsUploading(true);
    try {
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, folder, contentType: file.type }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) {
        setError(presignData.error || "تعذّر رفع الصورة");
        return;
      }

      const putRes = await fetch(presignData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) {
        setError("تعذّر رفع الصورة إلى التخزين");
        return;
      }

      setPreviewUrl(presignData.publicUrl);
      await onUploaded(presignData.publicUrl);
    } catch {
      setError("حدث خطأ أثناء الرفع");
    } finally {
      setIsUploading(false);
    }
  }

  const shapeClass =
    shape === "circle" ? "h-24 w-24 rounded-full" : shape === "wide" ? "h-32 w-full rounded-xl" : "h-24 w-24 rounded-xl";

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-sub">{label}</span>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative flex shrink-0 items-center justify-center overflow-hidden border border-dashed border-[#c7d6df] bg-brand-light text-brand transition hover:border-brand",
            shapeClass,
          )}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6" />
          )}
          {isUploading && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#dbe4ea] px-3 py-2 text-xs font-bold text-ink hover:bg-[#f3f6f8]"
        >
          <Upload className="h-3.5 w-3.5" />
          {previewUrl ? "تغيير الصورة" : "رفع صورة"}
        </button>
      </div>
      {error && <span className="text-xs font-medium text-danger">{error}</span>}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
