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
  cost_price: p.costPrice ?? null,
  images: JSON.stringify(p.images ?? []),
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

  // Restocking by hand has to clear the low-stock flag too, or the alert for
  // this product fires exactly once ever and then goes quiet for good.
  await clearLowStockIfRecovered(sku, stock);
}

/** Forget the low-stock warning once a product is comfortably back above the line. */
async function clearLowStockIfRecovered(sku: string, stock: number | null): Promise<void> {
  const db = await getDb();
  if (!db) return;
  if (stock === null) {
    // No longer counted at all — a stale flag would block a future alert.
    await db.prepare("DELETE FROM low_stock_notified WHERE sku = ?").bind(sku).run();
    return;
  }
  const meta = await db
    .prepare("SELECT low_stock_at FROM products WHERE sku = ?")
    .bind(sku)
    .first<{ low_stock_at: number }>();
  if (meta && stock > (meta.low_stock_at ?? 5)) {
    await db.prepare("DELETE FROM low_stock_notified WHERE sku = ?").bind(sku).run();
  }
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

/* -------------------------------------------------------------- fulfilment */

export type StockMove = { sku: string; before: number; after: number; qty: number };

/**
 * Take sold items off the shelf, once per order.
 *
 * Returns null when this order has already been counted — which is the normal
 * case on a Stripe retry, not an error. Stripe redelivers events, sometimes
 * after a success, and a shop that decrements on every delivery oversells.
 *
 * Products with `stock` set to NULL aren't counted at all; that's the "we don't
 * track this one" case and it stays untouched.
 */
export async function applyStockForOrder(
  sessionId: string,
  lines: { sku: string; qty: number }[],
  actor: string,
): Promise<StockMove[] | null> {
  const db = await getDb();
  if (!db) throw new NoDatabase();
  if (lines.length === 0) return [];

  // Claim the order first. If this insert loses the race, another delivery of
  // the same event is already handling it and we must not also decrement.
  try {
    const claim = await db
      .prepare("INSERT OR IGNORE INTO stock_applied (session_id, detail) VALUES (?, '')")
      .bind(sessionId)
      .run();
    const changes = (claim as { meta?: { changes?: number } })?.meta?.changes;
    if (changes === 0) return null;
  } catch {
    return null;
  }

  const moves: StockMove[] = [];

  for (const line of lines) {
    const row = await db
      .prepare("SELECT stock FROM products WHERE sku = ?")
      .bind(line.sku)
      .first<{ stock: number | null }>();

    // Unknown SKU, or one we don't count — nothing to do, and not an error.
    if (!row || row.stock === null) continue;

    // Floor at zero. A negative number on a shelf is not information, and it
    // makes every downstream "in stock?" check read strangely.
    const after = Math.max(0, row.stock - line.qty);
    if (after === row.stock) continue;

    await db
      .prepare("UPDATE products SET stock = ?, updated_at = datetime('now') WHERE sku = ?")
      .bind(after, line.sku)
      .run();

    await db
      .prepare("INSERT INTO product_audit (sku, action, changes, actor) VALUES (?, 'sold', ?, ?)")
      .bind(line.sku, JSON.stringify({ stock: [row.stock, after], qty: line.qty, order: sessionId }), actor)
      .run();

    moves.push({ sku: line.sku, before: row.stock, after, qty: line.qty });
  }

  await db
    .prepare("UPDATE stock_applied SET detail = ? WHERE session_id = ?")
    .bind(JSON.stringify(moves), sessionId)
    .run();

  return moves;
}

/** Put stock back, for a refund. Mirrors applyStockForOrder and is also logged. */
export async function restoreStockForOrder(
  sessionId: string,
  lines: { sku: string; qty: number }[],
  actor: string,
): Promise<StockMove[]> {
  const db = await getDb();
  if (!db) throw new NoDatabase();
  const moves: StockMove[] = [];

  for (const line of lines) {
    const row = await db
      .prepare("SELECT stock FROM products WHERE sku = ?")
      .bind(line.sku)
      .first<{ stock: number | null }>();
    if (!row || row.stock === null) continue;

    const after = row.stock + line.qty;
    await db
      .prepare("UPDATE products SET stock = ?, updated_at = datetime('now') WHERE sku = ?")
      .bind(after, line.sku)
      .run();
    await db
      .prepare("INSERT INTO product_audit (sku, action, changes, actor) VALUES (?, 'restocked', ?, ?)")
      .bind(line.sku, JSON.stringify({ stock: [row.stock, after], qty: line.qty, order: sessionId }), actor)
      .run();

    // Clear the low-stock flag when this lifts the product back above its
    // threshold. Without this the warning only ever fires once in the product's
    // lifetime: it would stay "already notified" through every restock, and the
    // next time it ran low you would hear nothing.
    await clearLowStockIfRecovered(line.sku, after);

    moves.push({ sku: line.sku, before: row.stock, after, qty: line.qty });
  }

  // Let the order be counted again if it is ever re-paid.
  await db.prepare("DELETE FROM stock_applied WHERE session_id = ?").bind(sessionId).run();
  return moves;
}

/**
 * Which of these moves crossed the low-stock line for the first time.
 *
 * "For the first time" is the whole point — without the notified table you get
 * an email on every order while a product sits low, and you start ignoring them.
 * Rising back above the threshold clears the flag so the next fall warns again.
 */
export async function lowStockCrossings(moves: StockMove[]): Promise<
  { sku: string; title: string; stock: number; lowStockAt: number }[]
> {
  const db = await getDb();
  if (!db) return [];
  const crossed: { sku: string; title: string; stock: number; lowStockAt: number }[] = [];

  for (const m of moves) {
    const row = await db
      .prepare("SELECT title, low_stock_at FROM products WHERE sku = ?")
      .bind(m.sku)
      .first<{ title: string; low_stock_at: number }>();
    if (!row) continue;

    const threshold = row.low_stock_at ?? 5;

    if (m.after > threshold) {
      // Back above the line — forget we warned, so the next fall warns again.
      await db.prepare("DELETE FROM low_stock_notified WHERE sku = ?").bind(m.sku).run();
      continue;
    }

    const already = await db
      .prepare("SELECT sku FROM low_stock_notified WHERE sku = ?")
      .bind(m.sku)
      .first<{ sku: string }>();
    if (already) continue;

    await db
      .prepare("INSERT OR REPLACE INTO low_stock_notified (sku, at_level) VALUES (?, ?)")
      .bind(m.sku, m.after)
      .run();

    crossed.push({ sku: m.sku, title: row.title, stock: m.after, lowStockAt: threshold });
  }

  return crossed;
}

/* --------------------------------------------------------- abandoned carts */

/**
 * Claim the right to send one abandoned-cart reminder for this session.
 *
 * Returns false when a reminder has already gone out — the normal case on a
 * Stripe redelivery, not an error. Same shape as the stock claim: the insert
 * itself is the lock, so two concurrent deliveries cannot both win.
 */
export async function claimCartReminder(sessionId: string, email: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    const res = await db
      .prepare("INSERT OR IGNORE INTO cart_reminded (session_id, email) VALUES (?, ?)")
      .bind(sessionId, email)
      .run();
    return (res as { meta?: { changes?: number } })?.meta?.changes !== 0;
  } catch {
    return false;
  }
}
