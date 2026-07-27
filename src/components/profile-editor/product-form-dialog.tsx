"use client";

import { Plus } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { createProductAction, updateProductAction } from "@/lib/actions/products";
import type { ProductFormState } from "@/lib/actions/products";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadField } from "@/components/profile-editor/image-upload-field";

type FieldDef = { key: string; label: string; type: "text" | "number" };
type Category = { id: string; name: string; fieldSchema: FieldDef[] };

export type EditableProduct = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  price: string;
  discountCode: string | null;
  quantityRemaining: number | null;
  deliveryEnabled: boolean;
  contactMode: "NONE" | "CALL" | "LINK";
  contactValue: string | null;
  categoryId: string | null;
  dynamicFields: Record<string, string>;
};

export function ProductFormDialog({
  userId,
  categories,
  product,
  trigger,
}: {
  userId: string;
  categories: Category[];
  product?: EditableProduct;
  trigger?: React.ReactNode;
}) {
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
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4" />
            إضافة منتج
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[560px]">
        <DialogTitle>{product ? "تعديل المنتج" : "إضافة منتج جديد"}</DialogTitle>
        <ProductForm
          key={instanceKey}
          userId={userId}
          categories={categories}
          product={product}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ProductForm({
  userId,
  categories,
  product,
  onSuccess,
}: {
  userId: string;
  categories: Category[];
  product?: EditableProduct;
  onSuccess: () => void;
}) {
  const action = product
    ? (updateProductAction.bind(null, userId, product.id) as (
        state: ProductFormState,
        formData: FormData,
      ) => Promise<ProductFormState>)
    : (createProductAction.bind(null, userId) as (
        state: ProductFormState,
        formData: FormData,
      ) => Promise<ProductFormState>);

  const [state, formAction, isPending] = useActionState(action, undefined);
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? "");
  const [contactMode, setContactMode] = useState(product?.contactMode ?? "NONE");
  const [deliveryEnabled, setDeliveryEnabled] = useState(product?.deliveryEnabled ?? false);
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? null);

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state?.success, onSuccess]);

  const activeCategory = categories.find((c) => c.id === categoryId);

  return (
    <form action={formAction} className="flex max-h-[70vh] flex-col gap-3.5 overflow-y-auto pe-1">
      {state?.error && (
        <div className="rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm font-medium text-danger">{state.error}</div>
      )}

      <ImageUploadField
        targetUserId={userId}
        folder="products"
        currentUrl={imageUrl}
        shape="wide"
        label="صورة المنتج"
        onUploaded={(url) => setImageUrl(url)}
      />
      <input type="hidden" name="imageUrl" value={imageUrl ?? ""} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">اسم المنتج</Label>
        <Input id="name" name="name" defaultValue={product?.name} required />
        {state?.fieldErrors?.name && <span className="text-xs font-medium text-danger">{state.fieldErrors.name}</span>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">وصف المنتج</Label>
        <Textarea id="description" name="description" defaultValue={product?.description} rows={2} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price">السعر</Label>
          <Input id="price" name="price" type="number" step="0.01" min="0" defaultValue={product?.price} required />
          {state?.fieldErrors?.price && <span className="text-xs font-medium text-danger">{state.fieldErrors.price}</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="quantityRemaining">الكمية المتبقية</Label>
          <Input
            id="quantityRemaining"
            name="quantityRemaining"
            type="number"
            min="0"
            defaultValue={product?.quantityRemaining ?? ""}
            placeholder="غير محدودة"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="discountCode">كود خصم (اختياري)</Label>
        <Input id="discountCode" name="discountCode" dir="ltr" defaultValue={product?.discountCode ?? ""} />
      </div>

      {categories.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="categoryId">الفئة</Label>
          <Select id="categoryId" name="categoryId" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">بدون فئة</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {activeCategory && activeCategory.fieldSchema.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl bg-[#f8fafb] p-3.5">
          <span className="text-xs font-bold text-sub">حقول خاصة بفئة {activeCategory.name}</span>
          {activeCategory.fieldSchema.map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <Label htmlFor={`field_${field.key}`}>{field.label}</Label>
              <Input
                id={`field_${field.key}`}
                name={`field_${field.key}`}
                type={field.type === "number" ? "number" : "text"}
                defaultValue={product?.dynamicFields?.[field.key] ?? ""}
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl border border-[#e7edf1] p-3.5">
        <span className="text-sm font-bold text-ink">تفعيل خدمة التوصيل لهذا المنتج</span>
        <Switch checked={deliveryEnabled} onCheckedChange={setDeliveryEnabled} />
        <input type="hidden" name="deliveryEnabled" value={deliveryEnabled ? "on" : ""} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contactMode">زر خاص بالمنتج</Label>
        <Select
          id="contactMode"
          name="contactMode"
          value={contactMode}
          onChange={(e) => setContactMode(e.target.value as typeof contactMode)}
        >
          <option value="NONE">بلا زر خاص</option>
          <option value="CALL">اتصال مباشر</option>
          <option value="LINK">رابط خارجي</option>
        </Select>
      </div>

      {contactMode !== "NONE" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contactValue">{contactMode === "CALL" ? "رقم الهاتف" : "الرابط"}</Label>
          <Input id="contactValue" name="contactValue" dir="ltr" defaultValue={product?.contactValue ?? ""} />
        </div>
      )}

      <DialogFooter>
        <Button type="submit" className="flex-1" disabled={isPending}>
          {isPending ? "جارٍ الحفظ..." : product ? "حفظ التعديلات" : "إضافة"}
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
