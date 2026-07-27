import { Package } from "lucide-react";
import Link from "next/link";
import { deleteProductAction, toggleProductActiveAction, toggleProductDeliveryAction } from "@/lib/actions/products";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CategoryManager } from "@/components/profile-editor/category-manager";
import { ProductFormDialog } from "@/components/profile-editor/product-form-dialog";
import { cn } from "@/lib/utils";
import type { EditablePage } from "@/lib/editable-page";

export function ProductsManager({
  userId,
  page,
  basePath,
  activeCategoryId,
}: {
  userId: string;
  page: NonNullable<EditablePage["businessProfile"]>;
  basePath: string;
  activeCategoryId?: string;
}) {
  const categories = page.categories.map((c) => ({
    id: c.id,
    name: c.name,
    fieldSchema: (c.fieldSchema as { key: string; label: string; type: "text" | "number" }[]) ?? [],
  }));

  const products = activeCategoryId ? page.products.filter((p) => p.categoryId === activeCategoryId) : page.products;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-sub">{page.products.length.toLocaleString("ar")} منتج</div>
        <ProductFormDialog userId={userId} categories={categories} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={basePath}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-bold",
            !activeCategoryId ? "bg-brand text-white" : "bg-brand-light text-brand-deep",
          )}
        >
          الكل
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`${basePath}?category=${c.id}`}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-bold",
              activeCategoryId === c.id ? "bg-brand text-white" : "bg-brand-light text-brand-deep",
            )}
          >
            {c.name}
          </Link>
        ))}
      </div>

      <CategoryManager userId={userId} categories={categories} />

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="لا توجد منتجات بعد"
          description="أضف أول منتج من زر (إضافة منتج) في الأعلى."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="overflow-hidden rounded-2xl border border-[#e7edf1] bg-white"
              style={{ opacity: product.active ? 1 : 0.5 }}
            >
              <div className="h-24 bg-brand-light">
                {product.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="p-3">
                <div className="truncate text-sm font-bold text-ink">{product.name}</div>
                <div className="mt-1 text-sm font-bold text-brand">
                  {product.price.toString()} ل.س
                </div>
                {product.quantityRemaining !== null && product.quantityRemaining <= 5 && (
                  <Badge variant="warning" className="mt-1.5">
                    كمية محدودة: {product.quantityRemaining}
                  </Badge>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <form action={toggleProductDeliveryAction.bind(null, userId, product.id)}>
                    <button
                      type="submit"
                      className={cn("cursor-pointer font-bold", product.deliveryEnabled ? "text-success" : "text-danger")}
                    >
                      {product.deliveryEnabled ? "✓ التوصيل متاح" : "التوصيل معطّل"}
                    </button>
                  </form>
                </div>
                <div className="mt-2 flex items-center gap-3 border-t border-[#f0f3f5] pt-2 text-xs font-bold">
                  <ProductFormDialog
                    userId={userId}
                    categories={categories}
                    product={{
                      id: product.id,
                      name: product.name,
                      description: product.description,
                      imageUrl: product.imageUrl,
                      price: product.price.toString(),
                      discountCode: product.discountCode,
                      quantityRemaining: product.quantityRemaining,
                      deliveryEnabled: product.deliveryEnabled,
                      contactMode: product.contactMode,
                      contactValue: product.contactValue,
                      categoryId: product.categoryId,
                      dynamicFields: (product.dynamicFields as Record<string, string>) ?? {},
                    }}
                    trigger={<button className="cursor-pointer text-brand hover:text-brand-deep">تعديل</button>}
                  />
                  <form action={toggleProductActiveAction.bind(null, userId, product.id)}>
                    <button type="submit" className="cursor-pointer text-sub hover:text-ink">
                      {product.active ? "إخفاء" : "إظهار"}
                    </button>
                  </form>
                  <form action={deleteProductAction.bind(null, userId, product.id)}>
                    <button type="submit" className="cursor-pointer text-danger hover:text-danger/80">
                      حذف
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
