"use client";

import { Plus, Settings2, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";
import {
  createProductCategoryAction,
  deleteProductCategoryAction,
  updateCategoryFieldsAction,
} from "@/lib/actions/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

type FieldDef = { key: string; label: string; type: "text" | "number" };
type Category = { id: string; name: string; fieldSchema: FieldDef[] };

export function CategoryManager({ userId, categories }: { userId: string; categories: Category[] }) {
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  function handleCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      const result = await createProductCategoryAction(userId, newName.trim());
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setNewName("");
      setError(undefined);
    });
  }

  return (
    <div className="rounded-2xl border border-[#e7edf1] bg-white p-4">
      <div className="mb-3 text-sm font-extrabold text-ink">إدارة الفئات</div>
      <div className="mb-3 flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="اسم فئة جديدة"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreate();
            }
          }}
        />
        <Button type="button" size="sm" onClick={handleCreate} disabled={isPending}>
          <Plus className="h-4 w-4" />
          إضافة
        </Button>
      </div>
      {error && <div className="mb-2 text-xs font-medium text-danger">{error}</div>}

      {categories.length === 0 ? (
        <p className="text-xs text-sub">لا توجد فئات بعد.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center gap-1.5 rounded-full bg-brand-light py-1 ps-3 pe-1.5 text-xs font-bold text-brand-deep"
            >
              {category.name}
              <button
                type="button"
                onClick={() => setEditingCategory(category)}
                className="cursor-pointer rounded-full p-1 hover:bg-white/60"
                title="تعديل الحقول الديناميكية"
              >
                <Settings2 className="h-3 w-3" />
              </button>
              <form action={deleteProductCategoryAction.bind(null, userId, category.id)}>
                <button type="submit" className="cursor-pointer rounded-full p-1 hover:bg-white/60" title="حذف الفئة">
                  <Trash2 className="h-3 w-3 text-danger" />
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      {editingCategory && (
        <CategoryFieldsDialog
          userId={userId}
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
        />
      )}
    </div>
  );
}

function CategoryFieldsDialog({
  userId,
  category,
  onClose,
}: {
  userId: string;
  category: Category;
  onClose: () => void;
}) {
  const [fields, setFields] = useState<FieldDef[]>(category.fieldSchema);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function handleSave() {
    startTransition(async () => {
      const result = await updateCategoryFieldsAction(userId, category.id, fields);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[480px]">
        <DialogTitle>الحقول الديناميكية — {category.name}</DialogTitle>
        <p className="mb-3 text-xs text-sub">
          الحقول التي تُضاف هنا تظهر تلقائيًا عند إضافة منتج ضمن هذه الفئة.
        </p>

        <div className="flex flex-col gap-2.5">
          {fields.map((field, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={field.label}
                onChange={(e) =>
                  setFields((prev) =>
                    prev.map((f, i) => (i === index ? { ...f, label: e.target.value } : f)),
                  )
                }
                placeholder="اسم الحقل (مثال: الحجم)"
                className="flex-1"
              />
              <Select
                value={field.type}
                onChange={(e) =>
                  setFields((prev) =>
                    prev.map((f, i) => (i === index ? { ...f, type: e.target.value as "text" | "number" } : f)),
                  )
                }
                className="w-28"
              >
                <option value="text">نص</option>
                <option value="number">رقم</option>
              </Select>
              <button
                type="button"
                onClick={() => setFields((prev) => prev.filter((_, i) => i !== index))}
                className="cursor-pointer rounded-lg p-2 text-sub hover:bg-[#f3f6f8]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() =>
              setFields((prev) => [
                ...prev,
                { key: `field${prev.length + 1}_${Date.now().toString(36)}`, label: "", type: "text" },
              ])
            }
          >
            <Plus className="h-4 w-4" />
            إضافة حقل
          </Button>
        </div>

        {error && <div className="mt-2 text-xs font-medium text-danger">{error}</div>}

        <DialogFooter>
          <Button type="button" className="flex-1" onClick={handleSave} disabled={isPending}>
            {isPending ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="secondary" className="flex-1">
              إلغاء
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
