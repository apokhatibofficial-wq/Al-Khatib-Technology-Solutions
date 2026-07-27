"use client";

import { Image as ImageIcon, Paperclip, Search, X } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { searchRecipientsAction, sendNotificationAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Recipient = { id: string; fullName: string; username: string };

export function ComposeNotificationForm() {
  const [state, formAction, isPending] = useActionState(sendNotificationAction, undefined);
  const [mode, setMode] = useState<"single" | "multiple" | "all">("single");
  const [selected, setSelected] = useState<Recipient[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Recipient[]>([]);
  const [searchPending, startSearch] = useTransition();
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentKind, setAttachmentKind] = useState<"NONE" | "IMAGE" | "FILE">("NONE");

  function handleSearch(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    startSearch(async () => {
      const found = await searchRecipientsAction(value);
      setResults(found);
    });
  }

  function addRecipient(recipient: Recipient) {
    setSelected((prev) => {
      if (prev.some((p) => p.id === recipient.id)) return prev;
      if (mode === "single") return [recipient];
      return [...prev, recipient];
    });
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-2xl border border-[#e7edf1] bg-white p-6"
      key={state?.success ? "sent" : "compose"}
    >
      {state?.error && (
        <div className="rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm font-medium text-danger">{state.error}</div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-success/10 px-3.5 py-2.5 text-sm font-medium text-success">
          تم إرسال الرسالة بنجاح.
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="recipientMode">إرسال إلى</Label>
        <Select
          id="recipientMode"
          name="recipientMode"
          value={mode}
          onChange={(e) => {
            const next = e.target.value as typeof mode;
            setMode(next);
            setSelected(next === "single" ? selected.slice(0, 1) : selected);
          }}
        >
          <option value="single">مستخدم واحد</option>
          <option value="multiple">عدة مستخدمين محددين</option>
          <option value="all">الكل (بث جماعي)</option>
        </Select>
      </div>

      {mode !== "all" && (
        <div className="flex flex-col gap-2">
          <Label>البحث عن مستخدم باليوزرنيم أو الاسم</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sub" />
            <Input value={query} onChange={(e) => handleSearch(e.target.value)} placeholder="ابحث..." className="pe-9" />
          </div>
          {searchPending && <span className="text-xs text-sub">جارٍ البحث...</span>}
          {results.length > 0 && (
            <div className="flex flex-col gap-1 rounded-xl border border-[#e7edf1] p-2">
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => addRecipient(r)}
                  className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-start text-sm hover:bg-[#f3f6f8]"
                >
                  <span>
                    {r.fullName} <span className="text-xs text-sub">@{r.username}</span>
                  </span>
                  <span className="text-xs font-bold text-brand">إضافة</span>
                </button>
              ))}
            </div>
          )}

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.map((r) => (
                <span
                  key={r.id}
                  className="flex items-center gap-1.5 rounded-full bg-brand-light py-1 ps-3 pe-1.5 text-xs font-bold text-brand-deep"
                >
                  {r.fullName}
                  <input type="hidden" name="recipientIds" value={r.id} />
                  <button
                    type="button"
                    onClick={() => setSelected((prev) => prev.filter((p) => p.id !== r.id))}
                    className="cursor-pointer rounded-full p-1 hover:bg-white/60"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {state?.fieldErrors?.recipientIds && (
            <span className="text-xs font-medium text-danger">{state.fieldErrors.recipientIds}</span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">عنوان الرسالة</Label>
        <Input id="title" name="title" required />
        {state?.fieldErrors?.title && <span className="text-xs font-medium text-danger">{state.fieldErrors.title}</span>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="body">نص الرسالة</Label>
        <Textarea id="body" name="body" rows={4} required />
        {state?.fieldErrors?.body && <span className="text-xs font-medium text-danger">{state.fieldErrors.body}</span>}
      </div>

      <NotificationAttachmentField
        value={attachmentUrl}
        onChange={(url, kind) => {
          setAttachmentUrl(url);
          setAttachmentKind(kind);
        }}
      />
      <input type="hidden" name="attachmentUrl" value={attachmentUrl} />
      <input type="hidden" name="attachmentKind" value={attachmentKind} />

      <Button type="submit" className="self-start" disabled={isPending}>
        {isPending ? "جارٍ الإرسال..." : "إرسال"}
      </Button>
    </form>
  );
}

function NotificationAttachmentField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string, kind: "NONE" | "IMAGE" | "FILE") => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>();

  async function handleFile(file: File) {
    setIsUploading(true);
    setError(undefined);
    try {
      const kind: "IMAGE" | "FILE" = file.type.startsWith("image/") ? "IMAGE" : "FILE";
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder: "attachments",
          contentType: file.type || "application/octet-stream",
        }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) {
        setError(presignData.error || "تعذّر رفع الملف");
        return;
      }
      const putRes = await fetch(presignData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putRes.ok) {
        setError("تعذّر رفع الملف إلى التخزين");
        return;
      }
      onChange(presignData.publicUrl, kind);
    } catch {
      setError("حدث خطأ أثناء الرفع");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>مرفق (صورة أو ملف) — اختياري</Label>
      <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-[#dbe4ea] px-3 py-2 text-xs font-bold text-ink hover:bg-[#f3f6f8]">
        {value ? <ImageIcon className="h-3.5 w-3.5" /> : <Paperclip className="h-3.5 w-3.5" />}
        {isUploading ? "جارٍ الرفع..." : value ? "تم إرفاق ملف — تغيير" : "إرفاق ملف"}
        <input
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </label>
      {error && <span className="text-xs font-medium text-danger">{error}</span>}
    </div>
  );
}
