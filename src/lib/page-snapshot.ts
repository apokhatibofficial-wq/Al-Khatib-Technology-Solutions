import type {
  BusinessProfile,
  ContactButton,
  IndividualProfile,
  Product,
  ProductCategory,
  PublicPage,
} from "@/generated/prisma/client";

export type PublicProduct = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  price: string;
  discountCode: string | null;
  quantityRemaining: number | null;
  deliveryEnabled: boolean;
  contactMode: string;
  contactValue: string | null;
  categoryId: string | null;
  dynamicFields: unknown;
  sortOrder: number;
};

export type PublicBusinessSnapshot = {
  companyName: string;
  activityCategory: string | null;
  description: string;
  logoUrl: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  splashEnabled: boolean;
  splashImageUrl: string | null;
  splashDurationSeconds: number;
  categories: { id: string; name: string; sortOrder: number }[];
  products: PublicProduct[];
};

export type PublicPageSnapshot = {
  type: "INDIVIDUAL" | "BUSINESS";
  layoutTemplate: string;
  brandColor: string;
  showWatermark: boolean;
  contactButtons: {
    kind: string;
    enabled: boolean;
    value: string | null;
    label: string | null;
  }[];
  individual?: {
    displayName: string;
    profession: string | null;
    bio: string;
    avatarUrl: string | null;
    coverUrl: string | null;
  };
  business?: PublicBusinessSnapshot;
};

type FullPage = PublicPage & {
  contactButtons: ContactButton[];
  individualProfile: (IndividualProfile & { profession: { name: string } | null }) | null;
  businessProfile:
    | (BusinessProfile & {
        activityCategory: { name: string } | null;
        categories: ProductCategory[];
        products: Product[];
      })
    | null;
};

export type ProductGroup = {
  category: { id: string; name: string } | null;
  products: PublicProduct[];
};

/** Groups a business's products by category for public display, in category
 * sortOrder, with uncategorized products last. Categories with no active
 * products never appear. */
export function groupProductsByCategory(business: PublicBusinessSnapshot | undefined): ProductGroup[] {
  if (!business) return [];
  const categoryById = new Map(business.categories.map((c) => [c.id, c]));
  const groups = new Map<string, ProductGroup>();
  const order: string[] = [];

  for (const product of business.products) {
    const key = product.categoryId ?? "";
    if (!groups.has(key)) {
      const category = product.categoryId ? (categoryById.get(product.categoryId) ?? null) : null;
      groups.set(key, { category: category ? { id: category.id, name: category.name } : null, products: [] });
      order.push(key);
    }
    groups.get(key)!.products.push(product);
  }

  order.sort((a, b) => {
    if (a === "") return 1;
    if (b === "") return -1;
    return (categoryById.get(a)?.sortOrder ?? 0) - (categoryById.get(b)?.sortOrder ?? 0);
  });

  return order.map((key) => groups.get(key)!);
}

export function buildPageSnapshot(page: FullPage): PublicPageSnapshot {
  const base: PublicPageSnapshot = {
    type: page.type,
    layoutTemplate: page.layoutTemplate,
    brandColor: page.brandColor,
    showWatermark: page.showWatermark,
    contactButtons: page.contactButtons
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((b) => ({ kind: b.kind, enabled: b.enabled, value: b.value, label: b.label })),
  };

  if (page.type === "INDIVIDUAL" && page.individualProfile) {
    base.individual = {
      displayName: page.individualProfile.displayName,
      profession: page.individualProfile.profession?.name ?? null,
      bio: page.individualProfile.bio,
      avatarUrl: page.individualProfile.avatarUrl,
      coverUrl: page.individualProfile.coverUrl,
    };
  }

  if (page.type === "BUSINESS" && page.businessProfile) {
    base.business = {
      companyName: page.businessProfile.companyName,
      activityCategory: page.businessProfile.activityCategory?.name ?? null,
      description: page.businessProfile.description,
      logoUrl: page.businessProfile.logoUrl,
      avatarUrl: page.businessProfile.avatarUrl,
      coverUrl: page.businessProfile.coverUrl,
      splashEnabled: page.businessProfile.splashEnabled,
      splashImageUrl: page.businessProfile.splashImageUrl,
      splashDurationSeconds: page.businessProfile.splashDurationSeconds,
      categories: page.businessProfile.categories
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((c) => ({ id: c.id, name: c.name, sortOrder: c.sortOrder })),
      products: page.businessProfile.products
        .filter((p) => p.active)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          imageUrl: p.imageUrl,
          price: p.price.toString(),
          discountCode: p.discountCode,
          quantityRemaining: p.quantityRemaining,
          deliveryEnabled: p.deliveryEnabled,
          contactMode: p.contactMode,
          contactValue: p.contactValue,
          categoryId: p.categoryId,
          dynamicFields: p.dynamicFields,
          sortOrder: p.sortOrder,
        })),
    };
  }

  return base;
}
