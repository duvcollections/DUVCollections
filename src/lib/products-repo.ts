import { getDb } from "@/lib/db";
import type { Product } from "@/lib/catalog";
import seed from "@/data/products.json";

/**
 * Writes to the product catalogue.
 *
 * Every mutation is recorded in `product_audit` with who did it and what
 * changed — so a mistyped price at 11pm can be found and reversed, rather than
 * silently becoming the truth.
 */

export class NoDatabase extends Error {
  constructor() {
    super(
      "No D1 database is bound. Run the migration and add the DB binding in " +
        "wrangler.jsonc, then redeploy.",
    );
  }
}

const toRow = (p: Product) => ({
  sku: p.sku,
  slug: p.slug,
  title: p.title,
  price: p.price,
  category: p.category,
  subcategory: p.subcategory,
  description: p.description,
  highlights: JSON.stringify(p.highlights ?? []),
  good_for: p.goodFor ?? "",
  specs: JSON.stringify(p.specs ?? {}),
  art: p.art ?? "generic",
  seo_title: p.seoTitle ?? p.title,
  meta_description: p.metaDescription ?? "",
  keywords: JSON.stringify(p.keywords ?? []),
  stock: p.stock,
  low_stock_at: p.lowStockAt ?? 5,
  upc: p.upc,
  mpn: p.mpn ?? p.sku,
  ship_weight_oz: p.shipWeightOz ?? 4,
  wholesale: p.wholesale ? 1 : 0,
  condition: p.condition ?? "new",
  archived: p.archived ? 1 : 0,
});

const COLS = Object.keys(toRow({} as Product)) as string[];

async function audit(sku: string, action: string, changes: unknown, actor: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .prepare("INSERT INTO product_audit (sku, action, changes, actor) VALUES (?, ?, ?, ?)")
    .bind(sku, action, JSON.stringify(changes), actor)
    .run();
}

/** Copies the seed JSON into D1. Safe to run repeatedly — existing rows win. */
export async function seedCatalogue(actor: string): Promise<{ inserted: number }> {
  const db = await getDb();
  if (!db) throw new NoDatabase();

  const { results } = await db.prepare("SELECT sku FROM products").all<{ sku: string }>();
  const have = new Set(results.map((r) => r.sku));

  let inserted = 0;
  for (const p of seed as unknown as Product[]) {
    if (have.has(p.sku)) continue;
    const row = toRow({ ...p, archived: false });
    const placeholders = COLS.map(() => "?").join(", ");
    await db
      .prepare(`INSERT INTO products (${COLS.join(", ")}) VALUES (${placeholders})`)
      .bind(...COLS.map((c) => (row as Record<string, unknown>)[c]))
      .run();
    inserted++;
  }
  if (inserted) await audit("*", "created", { seeded: inserted }, actor);
  return { inserted };
}

export async function upsertProduct(p: Product, actor: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new NoDatabase();

  const existing = await db
    .prepare("SELECT * FROM products WHERE sku = ?")
    .bind(p.sku)
    .first<Record<string, unknown>>();

  const row = toRow(p) as Record<string, unknown>;

  if (existing) {
    const sets = COLS.filter((c) => c !== "sku").map((c) => `${c} = ?`).join(", ");
    await db
      .prepare(`UPDATE products SET ${sets}, updated_at = datetime('now') WHERE sku = ?`)
      .bind(...COLS.filter((c) => c !== "sku").map((c) => row[c]), p.sku)
      .run();

    const changed: Record<string, [unknown, unknown]> = {};
    for (const c of COLS) {
      if (String(existing[c] ?? "") !== String(row[c] ?? "")) {
        changed[c] = [existing[c], row[c]];
      }
    }
    if (Object.keys(changed).length) await audit(p.sku, "updated", changed, actor);
  } else {
    const placeholders = COLS.map(() => "?").join(", ");
    await db
      .prepare(`INSERT INTO products (${COLS.join(", ")}) VALUES (${placeholders})`)
      .bind(...COLS.map((c) => row[c]))
      .run();
    await audit(p.sku, "created", { title: p.title, price: p.price }, actor);
  }
}

/**
 * Archive rather than delete.
 *
 * A deleted product breaks every past order that referenced it, and every link
 * Google has already indexed. Archiving hides it from the shop and keeps the
 * history intact.
 */
export async function setArchived(sku: string, archived: boolean, actor: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new NoDatabase();
  await db
    .prepare("UPDATE products SET archived = ?, updated_at = datetime('now') WHERE sku = ?")
    .bind(archived ? 1 : 0, sku)
    .run();
  await audit(sku, archived ? "archived" : "restored", { archived }, actor);
}

export async function setStock(sku: string, stock: number | null, actor: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new NoDatabase();
  await db
    .prepare("UPDATE products SET stock = ?, updated_at = datetime('now') WHERE sku = ?")
    .bind(stock, sku)
    .run();
  await audit(sku, "updated", { stock }, actor);
}

export async function recentAudit(limit = 40) {
  const db = await getDb();
  if (!db) return [];
  const { results } = await db
    .prepare("SELECT * FROM product_audit ORDER BY at DESC LIMIT ?")
    .bind(limit)
    .all<{ id: number; sku: string; action: string; changes: string; actor: string; at: string }>();
  return results;
}

export const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
