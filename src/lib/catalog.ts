import raw from "@/data/products.json";

export type Product = {
  sku: string;
  slug: string;
  title: string;
  price: number;
  category: CategoryId;
  subcategory: string;

  /** Lead paragraph shown under the title. */
  description: string;
  /** Scannable bullets — what you get, how to handle it. */
  highlights: string[];
  /** One line: who this is for. */
  goodFor: string;
  specs: Record<string, string>;

  /** Which illustration to draw until real photography exists. */
  art: string;

  // ---- SEO ----
  seoTitle: string;
  metaDescription: string;
  keywords: string[];

  // ---- Inventory ----
  /** Units on hand. `null` means not yet counted — set real numbers before launch. */
  stock: number | null;
  lowStockAt: number;
  /** GS1-issued barcode. Must be a real one; never invent these. */
  upc: string | null;
  /** Manufacturer part number — ours to define, so it mirrors the SKU. */
  mpn: string;
  shipWeightOz: number;
  condition: "new" | "used" | "refurbished";
};

export type Availability = "in-stock" | "low-stock" | "out-of-stock";

export function availability(p: Product): Availability {
  if (p.stock === null) return "in-stock";
  if (p.stock <= 0) return "out-of-stock";
  if (p.stock <= p.lowStockAt) return "low-stock";
  return "in-stock";
}

export type CategoryId = "printing-supplies" | "jewelry" | "eyewear";

export const products = raw as unknown as Product[];

export const categories = [
  {
    id: "printing-supplies" as const,
    name: "Printing Supplies",
    short: "Printing",
    blurb: "DTF film, pigment ink, hot-melt powder, transfer paper and vinyl.",
    long:
      "Everything that goes through the printer and the press. We stock what we use ourselves, " +
      "which is why the range is narrow — these are the films, inks and powders that behave " +
      "predictably run after run.",
    tint: "var(--color-tint-printing)",
    accent: "var(--color-duv-cyan)",
  },
  {
    id: "jewelry" as const,
    name: "Jewelry",
    short: "Jewelry",
    blurb: "Gold-plated chains, pendants, earrings, bangles and rings.",
    long:
      "Gold-plated pieces sold singly and in wholesale lots. The multi-pair packs are priced for " +
      "resellers and market stalls; the individual chains and pendants are for gifting.",
    tint: "var(--color-tint-jewelry)",
    accent: "var(--color-duv-amber)",
  },
  {
    id: "eyewear" as const,
    name: "Eyewear",
    short: "Eyewear",
    blurb: "Sunglasses for men and women, including UV400-rated frames.",
    long:
      "A small, fast-moving selection of sunglasses — classic aviators, rectangular shades and " +
      "wraparound UV400 frames.",
    tint: "var(--color-tint-apparel)",
    accent: "var(--color-duv-coral)",
  },
];

export const subcategoryLabels: Record<string, string> = {
  film: "DTF Film",
  ink: "Ink",
  powder: "Powder",
  "transfer-paper": "Transfer Paper",
  vinyl: "Heat Transfer Vinyl",
  chains: "Chains",
  pendants: "Pendants",
  earrings: "Earrings",
  bangles: "Bangles",
  rings: "Rings & Nose Jewelry",
  sunglasses: "Sunglasses",
};

export const getCategory = (id: string) => categories.find((c) => c.id === id);

export const byCategory = (id: string) => products.filter((p) => p.category === id);

export const bySlug = (slug: string) => products.find((p) => p.slug === slug);

export const subcategoriesOf = (id: string) => {
  const seen = new Map<string, number>();
  for (const p of byCategory(id)) seen.set(p.subcategory, (seen.get(p.subcategory) ?? 0) + 1);
  return [...seen.entries()].map(([id, count]) => ({
    id,
    count,
    label: subcategoryLabels[id] ?? id,
  }));
};

export const related = (p: Product, n = 4) =>
  products
    .filter((x) => x.slug !== p.slug && x.subcategory === p.subcategory)
    .concat(products.filter((x) => x.slug !== p.slug && x.category === p.category))
    .filter((x, i, a) => a.findIndex((y) => y.slug === x.slug) === i)
    .slice(0, n);

export const search = (q: string) => {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  const terms = t.split(/\s+/);
  return products
    .map((p) => {
      const hay = `${p.title} ${p.sku} ${p.description} ${p.subcategory}`.toLowerCase();
      const score = terms.reduce((s, term) => s + (hay.includes(term) ? 1 : 0), 0);
      return { p, score };
    })
    .filter((x) => x.score === terms.length)
    .sort((a, b) => a.p.title.localeCompare(b.p.title))
    .map((x) => x.p);
};

export const priceRange = (id: string) => {
  const ps = byCategory(id).map((p) => p.price);
  return { min: Math.min(...ps), max: Math.max(...ps) };
};
