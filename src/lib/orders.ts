import { products } from "@/lib/catalog";
import { site } from "@/lib/site";

export type IncomingLine = { sku: string; qty: number };

export type PricedLine = {
  sku: string;
  title: string;
  qty: number;
  /** Cents. Taken from the catalogue, never from the browser. */
  unitAmount: number;
};

export type PricedCart = {
  lines: PricedLine[];
  subtotal: number;      // cents
  shipping: number;      // cents
  freeShipping: boolean;
};

const MAX_QTY = 99;
const MAX_LINES = 40;

/**
 * Rebuild the cart from the catalogue.
 *
 * The browser sends SKUs and quantities and nothing else. Every price is looked
 * up here, server-side. This is the single most important rule in a checkout: a
 * client that can name its own price will eventually be asked to.
 */
export function priceCart(incoming: unknown): PricedCart | { error: string } {
  if (!Array.isArray(incoming)) return { error: "Cart must be a list of items." };
  if (incoming.length === 0) return { error: "Your cart is empty." };
  if (incoming.length > MAX_LINES) return { error: "Too many different items in one order." };

  const seen = new Set<string>();
  const lines: PricedLine[] = [];

  for (const raw of incoming as IncomingLine[]) {
    if (!raw || typeof raw.sku !== "string") return { error: "Malformed cart item." };
    if (seen.has(raw.sku)) return { error: `Duplicate item: ${raw.sku}` };
    seen.add(raw.sku);

    const qty = Math.floor(Number(raw.qty));
    if (!Number.isFinite(qty) || qty < 1 || qty > MAX_QTY) {
      return { error: `Invalid quantity for ${raw.sku}.` };
    }

    const p = products.find((x) => x.sku === raw.sku);
    if (!p) return { error: `We no longer stock ${raw.sku}.` };
    if (p.stock !== null && p.stock <= 0) return { error: `${p.title} is out of stock.` };
    if (p.stock !== null && qty > p.stock) {
      return { error: `Only ${p.stock} of ${p.title} left.` };
    }

    lines.push({
      sku: p.sku,
      title: p.title,
      qty,
      unitAmount: Math.round(p.price * 100),
    });
  }

  const subtotal = lines.reduce((n, l) => n + l.unitAmount * l.qty, 0);
  const freeShipping = subtotal >= Math.round(site.policy.freeShippingThreshold * 100);
  const shipping = freeShipping ? 0 : Math.round(site.policy.shippingFlatRate * 100);

  return { lines, subtotal, shipping, freeShipping };
}
