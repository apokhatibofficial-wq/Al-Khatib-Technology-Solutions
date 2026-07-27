"use client";

import { Check, Copy, Download, ExternalLink, QrCode } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { publishPageAction } from "@/lib/actions/publish";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

export function PublishBar({
  userId,
  slug,
  published,
  hasUnpublishedChanges,
  showCelebration = false,
}: {
  userId: string;
  slug: string;
  published: boolean;
  hasUnpublishedChanges: boolean;
  showCelebration?: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [celebrateOpen, setCelebrateOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/u/${slug}` : `/u/${slug}`;

  function handleCopy() {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await publishPageAction(userId);
      setConfirmOpen(false);
      if (result.ok) {
        if (result.firstPublish && showCelebration) {
          setCelebrateOpen(true);
        }
        router.refresh();
      }
    });
  }

  const needsPublish = !published || hasUnpublishedChanges;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e7edf1] bg-white px-5 py-4">
        <div className="flex items-center gap-2 text-sm">
          {!published ? (
            <span className="font-bold text-sub">لم يُنشر بعد</span>
          ) : hasUnpublishedChanges ? (
            <span className="font-bold text-warning">لديك تعديلات غير منشورة</span>
          ) : (
            <span className="font-bold text-success">✓ منشور — لا توجد تغييرات معلّقة</span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          {published && (
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-light px-4 py-2.5 text-sm font-bold text-brand-deep hover:bg-brand-light/70"
            >
              <QrCode className="h-3.5 w-3.5" />
              الرابط وQR
            </button>
          )}
          <a
            href={`/u/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-light px-4 py-2.5 text-sm font-bold text-brand-deep hover:bg-brand-light/70"
          >
            معاينة الصفحة العامة <ExternalLink className="h-3.5 w-3.5" />
          </a>
          {needsPublish && (
            <Button onClick={() => setConfirmOpen(true)} disabled={isPending}>
              {hasUnpublishedChanges && published ? "نشر التعديلات" : "نشر"}
            </Button>
          )}
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-[380px] text-center">
          <DialogTitle>هل أنت متأكد أنك تريد النشر؟</DialogTitle>
          <p className="text-sm text-sub">سيصبح المحتوى مرئيًا للجمهور فور التأكيد.</p>
          <DialogFooter>
            <Button className="flex-1" onClick={handleConfirm} disabled={isPending}>
              {isPending ? "جارٍ النشر..." : "نشر"}
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="secondary" className="flex-1">
                إلغاء
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={celebrateOpen} onOpenChange={setCelebrateOpen}>
        <DialogContent className="max-w-[400px] text-center">
          <div className="mb-3.5 text-4xl">🎉</div>
          <DialogTitle>تهانينا!</DialogTitle>
          <p className="mb-2 text-sm text-sub">لقد قمت بنشر ملفك الشخصي</p>
          <DialogFooter>
            <Button className="w-full" onClick={() => setCelebrateOpen(false)}>
              حسنًا
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-[380px] text-center">
          <DialogTitle>رابط صفحتك وQR Code</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/qr/${slug}`}
            alt="QR Code"
            className="mx-auto h-44 w-44 rounded-xl border border-[#e7edf1] p-2"
          />
          <div dir="ltr" className="mt-4 truncate rounded-lg bg-[#f3f6f8] px-3 py-2.5 text-xs text-sub">
            {publicUrl}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" className="flex-1" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "تم النسخ" : "نسخ الرابط"}
            </Button>
            <a href={`/api/qr/${slug}`} download={`${slug}-qr.png`} className="flex-1">
              <Button type="button" className="w-full">
                <Download className="h-4 w-4" />
                تنزيل QR
              </Button>
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
