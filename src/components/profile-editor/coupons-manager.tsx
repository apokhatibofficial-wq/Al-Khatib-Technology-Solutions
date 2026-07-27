"use client";

import { Plus, Tag } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { createCouponAction, deleteCouponAction, toggleCouponPublishedAction } from "@/lib/actions/coupons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Coupon = {
  id: string;
  title: string;
  description: string;
  color: string;
  startDate: Date | null;
  endDate: Date | null;
  published: boolean;
};

export function CouponsManager({ userId, coupons }: { userId: string; coupons: Coupon[] }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <AddCouponDialog userId={userId} />
      </div>

      {coupons.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="لا توجد كوبونات أو عروض بعد"
          description="أضف أول كوبون ليظهر أعلى صفحتك العامة بعد نشره."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e7edf1] bg-white p-4">
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-lg" style={{ backgroundColor: coupon.color }} />
                <div>
                  <div className="text-sm font-bold text-ink">{coupon.title}</div>
                  {coupon.description && <div className="text-xs text-sub">{coupon.description}</div>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={coupon.published ? "success" : "neutral"}>
                  {coupon.published ? "منشور" : "غير منشور"}
                </Badge>
                <form action={toggleCouponPublishedAction.bind(null, userId, coupon.id)}>
                  <Button type="submit" size="sm" variant={coupon.published ? "secondary" : "primary"}>
                    {coupon.published ? "إلغاء النشر" : "نشر الكوبون"}
                  </Button>
                </form>
                <form action={deleteCouponAction.bind(null, userId, coupon.id)}>
                  <button type="submit" className="cursor-pointer text-xs font-bold text-danger hover:text-danger/80">
                    حذف
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddCouponDialog({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [instanceKey, setInstanceKey] = useState(0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setInstanceKey((k) => k + 1);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          إضافة كوبون
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>إضافة كوبون أو عرض</DialogTitle>
        <AddCouponForm key={instanceKey} userId={userId} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function AddCouponForm({ userId, onSuccess }: { userId: string; onSuccess: () => void }) {
  const boundAction = createCouponAction.bind(null, userId);
  const [state, formAction, isPending] = useActionState(boundAction, undefined);

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state?.success, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      {state?.error && (
        <div className="rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm font-medium text-danger">{state.error}</div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">نص الكوبون / العرض</Label>
        <Input id="title" name="title" placeholder="مثال: خصم 20% على الطلبات فوق 50,000 ل.س" required />
        {state?.fieldErrors?.title && <span className="text-xs font-medium text-danger">{state.fieldErrors.title}</span>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">تفاصيل إضافية (اختياري)</Label>
        <Textarea id="description" name="description" rows={2} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startDate">تاريخ البداية</Label>
          <Input id="startDate" name="startDate" type="date" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="endDate">تاريخ النهاية</Label>
          <Input id="endDate" name="endDate" type="date" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="color">لون الكوبون</Label>
        <Input id="color" name="color" type="color" defaultValue="#e08a1f" className="h-11 w-20 p-1" />
      </div>

      <DialogFooter>
        <Button type="submit" className="flex-1" disabled={isPending}>
          {isPending ? "جارٍ الإضافة..." : "إضافة"}
        </Button>
        <DialogClose asChild>
          <Button type="button" variant="secondary" className="flex-1">
            إلغاء
          </Button>
        </DialogClose>
      </DialogFooter>
    </form>
  );
}
