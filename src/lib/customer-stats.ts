import type { Order } from "@/lib/orders-admin";
import type { Product } from "@/lib/catalog";

/**
 * Customer value and order profitability.
 *
 * Everything here is derived from orders Stripe has already confirmed, plus
 * cost prices you enter yourself. Nothing is accumulated in a running total
 * that could drift out of step with the payment processor.
 *
 * The honesty rule throughout: a figure that cannot be computed is reported as
 * unknown rather than estimated. A profit number that is quietly wrong gets
 * believed and acted on, which is worse than a gap that prompts a question.
 */

const DAY_MS = 86_400_000;

/* ----------------------------------------------------------- customers */

export type CustomerSummary = {
  email: string;
  name: string | null;
  orders: number;
  /** Net of refunds, in dollars. */
  spend: number;
  firstOrder: number;
  lastOrder: number;
  /** Mean gap between orders in days. Null for one-time buyers. */
  daysBetween: number | null;
};

export type CustomerStats = {
  customers: CustomerSummary[];
  total: number;
  repeat: number;
  /** Share of customers who ordered more than once, 0–1. */
  repeatRate: number;
  /** Mean net spend per customer. */
  lifetimeValue: number;
  /** Mean value of a single order. */
  averageOrder: number;
  /** Median days between consecutive orders, across repeat buyers only. */
  medianDaysBetween: number | null;
  top: CustomerSummary[];
};

/** Net of refunds and never negative — an over-refund is not negative revenue. */
const net = (o: Order) => Math.max(0, o.total - (o.refundedAmount ?? 0));

/**
 * Group orders by customer.
 *
 * Keyed on email because that is the only stable identity a guest checkout
 * gives us. Two orders from the same person under different addresses count
 * as two customers, which understates loyalty rather than overstating it —
 * the safer direction to be wrong in.
 */
export function customerStats(orders: Order[]): CustomerStats {
  const paid = orders.filter((o) => o.status !== "unpaid" && o.email);

  const byEmail = new Map<string, Order[]>();
  for (const o of paid) {
    const key = (o.email ?? "").toLowerCase().trim();
    if (!key) continue;
    const list = byEmail.get(key) ?? [];
    list.push(o);
    byEmail.set(key, list);
  }

  const customers: CustomerSummary[] = [];
  const gaps: number[] = [];

  for (const [email, list] of byEmail) {
    const sorted = [...list].sort((a, b) => a.created - b.created);
    const spend = sorted.reduce((n, o) => n + net(o), 0);
    const first = sorted[0].created;
    const last = sorted[sorted.length - 1].created;

    let daysBetween: number | null = null;
    if (sorted.length > 1) {
      // Mean of the actual gaps, not (last - first) / count — those differ
      // whenever the spacing is uneven, which it always is.
      const spans: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        spans.push((sorted[i].created - sorted[i - 1].created) / 86_400);
      }
      daysBetween = spans.reduce((a, b) => a + b, 0) / spans.length;
      gaps.push(...spans);
    }

    customers.push({
      email,
      name: sorted[sorted.length - 1].name,
      orders: sorted.length,
      spend,
      firstOrder: first,
      lastOrder: last,
      daysBetween,
    });
  }

  customers.sort((a, b) => b.spend - a.spend);

  const total = customers.length;
  const repeat = customers.filter((c) => c.orders > 1).length;
  const totalSpend = customers.reduce((n, c) => n + c.spend, 0);
  const totalOrders = customers.reduce((n, c) => n + c.orders, 0);

  return {
    customers,
    total,
    repeat,
    repeatRate: total ? repeat / total : 0,
    lifetimeValue: total ? totalSpend / total : 0,
    averageOrder: totalOrders ? totalSpend / totalOrders : 0,
    medianDaysBetween: median(gaps),
    top: customers.slice(0, 8),
  };
}

/** Median, or null for an empty set. Resistant to one outlier order. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/* -------------------------------------------------------------- profit */

export type OrderProfit = {
  ref: string;
  id: string;
  created: number;
  revenue: number;
  /** Cost of goods. Null when any line has no recorded cost. */
  cogs: number | null;
  shippingCharged: number;
  shippingCost: number | null;
  stripeFee: number;
  /** Null whenever a component is unknown — never a guess. */
  profit: number | null;
  /** SKUs on this order with no cost price recorded. */
  missingCost: string[];
};

/**
 * Stripe's standard US card fee.
 *
 * Hard-coded because Stripe does not return the fee on a Checkout Session
 * without a second API call per order, and this is accurate for the standard
 * rate. If a negotiated rate ever applies, this is the one line to change.
 */
const STRIPE_PCT = 0.029;
const STRIPE_FIXED = 0.3;

export function orderProfit(
  order: Order,
  products: Product[],
  /** Real label cost from Shippo, when known. */
  shippingCost?: number | null,
): OrderProfit {
  const revenue = net(order);

  // Goods cost, only if EVERY line has a recorded cost. A partial total looks
  // like a real number and silently understates what the order cost to fill.
  let cogs: number | null = 0;
  const missingCost: string[] = [];

  for (const line of order.skus) {
    const p = products.find((x) => x.sku === line.sku);
    const cost = p?.costPrice;
    if (cost === null || cost === undefined) {
      missingCost.push(line.sku);
      cogs = null;
      continue;
    }
    if (cogs !== null) cogs += cost * line.qty;
  }

  // An order with no recorded SKUs tells us nothing about its cost.
  if (order.skus.length === 0) {
    cogs = null;
  }

  const stripeFee = revenue > 0 ? revenue * STRIPE_PCT + STRIPE_FIXED : 0;
  const shippingCharged = order.shipping;
  const ship = shippingCost ?? null;

  const profit =
    cogs === null || ship === null ? null : revenue - cogs - ship - stripeFee;

  return {
    ref: order.ref,
    id: order.id,
    created: order.created,
    revenue,
    cogs,
    shippingCharged,
    shippingCost: ship,
    stripeFee,
    profit,
    missingCost,
  };
}

export type ProfitSummary = {
  orders: OrderProfit[];
  /** Orders where every input was known. */
  complete: number;
  incomplete: number;
  revenue: number;
  /** Summed only over complete orders, so it is never part-guessed. */
  profit: number;
  /** Margin on complete orders, 0–1. Null when there are none. */
  margin: number | null;
  /** Every SKU still missing a cost price, most-ordered first. */
  needCost: { sku: string; orders: number }[];
};

export function profitSummary(rows: OrderProfit[]): ProfitSummary {
  const complete = rows.filter((r) => r.profit !== null);
  const revenue = rows.reduce((n, r) => n + r.revenue, 0);
  const completeRevenue = complete.reduce((n, r) => n + r.revenue, 0);
  const profit = complete.reduce((n, r) => n + (r.profit ?? 0), 0);

  const counts = new Map<string, number>();
  for (const r of rows) {
    for (const sku of r.missingCost) counts.set(sku, (counts.get(sku) ?? 0) + 1);
  }

  return {
    orders: rows,
    complete: complete.length,
    incomplete: rows.length - complete.length,
    revenue,
    profit,
    margin: completeRevenue > 0 ? profit / completeRevenue : null,
    needCost: [...counts.entries()]
      .map(([sku, orders]) => ({ sku, orders }))
      .sort((a, b) => b.orders - a.orders),
  };
}

/** Days since a timestamp in Unix seconds. */
export const daysAgo = (seconds: number, nowMs: number) =>
  Math.floor((nowMs - seconds * 1000) / DAY_MS);
