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
  /** A multi-piece lot priced for resale, rather than a single retail piece. */
  wholesale: boolean;
  condition: "new" | "used" | "refurbished";
  archived?: boolean;

  /**
   * What we pay our supplier, per unit.
   *
   * Null means "not recorded" and reports say so rather than guessing. An
   * invented cost produces a confident profit figure that is simply wrong,
   * which is worse than an obvious gap.
   */
  costPrice?: number | null;

  /**
   * Photo URLs, best first. Empty until real photography exists, at which
   * point the storefront stops drawing an illustration and shows the product.
   */
  images?: string[];
};

export type Availability = "in-stock" | "low-stock" | "out-of-stock";

export function availability(p: Product): Availability {
  if (p.stock === null) return "in-stock";
  if (p.stock <= 0) return "out-of-stock";
  if (p.stock <= p.lowStockAt) return "low-stock";
  return "in-stock";
}

export type CategoryId = "printing-supplies" | "jewelry" | "eyewear" | "mens-tshirts";

import { getDb } from "@/lib/db";

/**
 * Catalogue access.
 *
 * Reads from D1 when a database is bound, and falls back to the seed JSON
 * otherwise — so the shop still renders under `next dev`, and a database
 * hiccup degrades to the last shipped catalogue instead of an empty store.
 */

const seed = raw as unknown as Product[];

type Row = Record<string, unknown>;

function fromRow(r: Row): Product {
  const j = <T,>(v: unknown, fallback: T): T => {
    try { return typeof v === "string" ? (JSON.parse(v) as T) : fallback; }
    catch { return fallback; }
  };
  return {
    sku: String(r.sku),
    slug: String(r.slug),
    title: String(r.title),
    price: Number(r.price),
    category: String(r.category) as CategoryId,
    subcategory: String(r.subcategory),
    description: String(r.description ?? ""),
    highlights: j<string[]>(r.highlights, []),
    goodFor: String(r.good_for ?? ""),
    specs: j<Record<string, string>>(r.specs, {}),
    art: String(r.art ?? "generic"),
    seoTitle: String(r.seo_title ?? r.title),
    metaDescription: String(r.meta_description ?? ""),
    keywords: j<string[]>(r.keywords, []),
    stock: r.stock === null || r.stock === undefined ? null : Number(r.stock),
    lowStockAt: Number(r.low_stock_at ?? 5),
    upc: r.upc ? String(r.upc) : null,
    mpn: String(r.mpn ?? r.sku),
    shipWeightOz: Number(r.ship_weight_oz ?? 4),
    wholesale: Boolean(Number(r.wholesale ?? 0)),
    condition: (String(r.condition ?? "new") as Product["condition"]),
    archived: Boolean(Number(r.archived ?? 0)),
    costPrice:
      r.cost_price === null || r.cost_price === undefined ? null : Number(r.cost_price),
    images: j<string[]>(r.images, []),
  };
}

/** Every product, archived ones included. Admin use. */
export async function allProducts(): Promise<Product[]> {
  const db = await getDb();
  if (!db) return seed.map((p) => ({ ...p, archived: p.archived ?? false }));
  try {
    const { results } = await db.prepare("SELECT * FROM products ORDER BY category, subcategory, title").all<Row>();
    if (results.length === 0) return seed.map((p) => ({ ...p, archived: false }));
    return results.map(fromRow);
  } catch {
    return seed.map((p) => ({ ...p, archived: false }));
  }
}

/** Products visible in the shop. */
export async function getProducts(): Promise<Product[]> {
  return (await allProducts()).filter((p) => !p.archived);
}

export async function bySlug(slug: string): Promise<Product | undefined> {
  return (await getProducts()).find((p) => p.slug === slug);
}

export async function bySku(sku: string): Promise<Product | undefined> {
  return (await allProducts()).find((p) => p.sku === sku);
}

export async function byCategory(id: string): Promise<Product[]> {
  return (await getProducts()).filter((p) => p.category === id);
}

export async function subcategoriesOf(id: string) {
  const seen = new Map<string, number>();
  for (const p of await byCategory(id)) seen.set(p.subcategory, (seen.get(p.subcategory) ?? 0) + 1);
  return [...seen.entries()].map(([sid, count]) => ({
    id: sid,
    count,
    label: subcategoryLabels[sid] ?? sid,
  }));
}

export async function related(p: Product, n = 4): Promise<Product[]> {
  const all = await getProducts();
  return all
    .filter((x) => x.slug !== p.slug && x.subcategory === p.subcategory)
    .concat(all.filter((x) => x.slug !== p.slug && x.category === p.category))
    .filter((x, i, a) => a.findIndex((y) => y.slug === x.slug) === i)
    .slice(0, n);
}

export async function search(q: string): Promise<Product[]> {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  const terms = t.split(/\s+/);
  return (await getProducts())
    .map((p) => {
      const hay = `${p.title} ${p.sku} ${p.description} ${p.subcategory}`.toLowerCase();
      return { p, score: terms.reduce((s, term) => s + (hay.includes(term) ? 1 : 0), 0) };
    })
    .filter((x) => x.score === terms.length)
    .sort((a, b) => a.p.title.localeCompare(b.p.title))
    .map((x) => x.p);
}

export async function priceRange(id: string) {
  const ps = (await byCategory(id)).map((p) => p.price);
  return ps.length ? { min: Math.min(...ps), max: Math.max(...ps) } : { min: 0, max: 0 };
}

export const wholesaleItems = async () => (await getProducts()).filter((p) => p.wholesale);

/** The bundled seed, for the one place that can't await: client-side cart pricing. */
export const seedProducts = seed;

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
    id: "mens-tshirts" as const,
    name: "Men's T-Shirts",
    short: "T-Shirts",
    blurb: "Blank and printed tees — the canvas for everything else we sell.",
    long:
      "Cotton tees ready to press, and finished designs pulled from our own artwork. The blanks " +
      "are chosen for how they take a transfer: tight weave, no surface treatment, and a weight " +
      "that survives a hot press without going thin at the shoulders.",
    tint: "var(--color-tint-apparel)",
    accent: "var(--color-duv-violet)",
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
  rings: "Rings",
  "nose-jewelry": "Nose Jewelry",
  sunglasses: "Sunglasses",
};

export const getCategory = (id: string) => categories.find((c) => c.id === id);

/**
 * Categories worth showing a shopper.
 *
 * A category with nothing in it is an empty shelf: the visitor clicks, finds
 * nothing, and learns the shop is unfinished. So a category earns its place in
 * the navigation by having at least one live product, and appears the moment
 * the first one is added — no config to remember, no second switch to flip.
 *
 * The category PAGE still resolves for an empty category; only the links to it
 * disappear. That keeps any URL already shared or indexed working.
 */
export async function visibleCategories() {
  const products = await getProducts();
  return categories.filter((c) => products.some((p) => p.category === c.id));
}
