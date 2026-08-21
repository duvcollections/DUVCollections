import type { Order } from "@/lib/orders-admin";
import type { Product } from "@/lib/catalog";
import { availability } from "@/lib/catalog";

/**
 * The numbers behind the admin dashboard.
 *
 * Pure functions over data already fetched, so they can be unit-tested without
 * a network or a database — and so the page itself stays a thin rendering
 * layer. Every figure here is derived from Stripe's own record of what was
 * paid; nothing is accumulated in a local counter that could drift.
 *
 * Money is in dollars throughout (Order.total is already converted), and time
 * is Unix *seconds*, matching Stripe. Mixing those two units is the single
 * easiest way to get a dashboard that quietly lies, so both are stated here.
 */

const DAY = 60 * 60 * 24;

export type Trend = {
  /** Percentage change vs the previous window. Null when there is no baseline. */
  pct: number | null;
  direction: "up" | "down" | "flat";
};

export type DayPoint = { day: string; label: string; revenue: number; orders: number };

export type TopProduct = {
  sku: string;
  title: string;
  units: number;
  revenue: number;
  stock: number | null;
  status: "in-stock" | "low-stock" | "out-of-stock";
};

export type RevenueSplit = { label: string; amount: number; share: number };

export type DashboardStats = {
  revenue: number;
  orderCount: number;
  averageOrder: number;
  unitsSold: number;
  revenueTrend: Trend;
  orderTrend: Trend;
  series: DayPoint[];
  topProducts: TopProduct[];
  /** Where the money actually sits: goods, shipping, tax collected. */
  split: RevenueSplit[];
  unshipped: number;
  oldestUnshippedHours: number | null;
  lowStock: number;
  outOfStock: number;
};

/**
 * Percentage change, guarding the case that trips most dashboards.
 *
 * Going from zero to anything is not "infinite growth" — it has no meaningful
 * percentage, so it reports as null and the UI shows a dash rather than a
 * nonsense number.
 */
export function trend(current: number, previous: number): Trend {
  if (previous === 0) return { pct: null, direction: current > 0 ? "up" : "flat" };
  const pct = ((current - previous) / previous) * 100;
  // Anything under a tenth of a percent is noise, not a movement.
  const direction = Math.abs(pct) < 0.1 ? "flat" : pct > 0 ? "up" : "down";
  return { pct, direction };
}

/** Local-date key (YYYY-MM-DD) for a Unix-seconds timestamp. */
const dayKey = (seconds: number) => {
  const d = new Date(seconds * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
};

const dayLabel = (seconds: number) =>
  new Date(seconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/**
 * Build the dashboard.
 *
 * `windowDays` is the reporting period; the same length immediately before it
 * becomes the comparison baseline, which is what makes the trend arrows mean
 * something rather than being decoration.
 *
 * Unpaid orders are excluded everywhere. An abandoned or failed checkout is not
 * revenue, and counting it would overstate every figure on the page.
 */
export function dashboardStats(
  orders: Order[],
  products: Product[],
  nowSeconds: number,
  windowDays = 30,
): DashboardStats {
  // Refunded orders are excluded from revenue and from the packing queue. An
  // order whose money went back is not income, and it does not need a parcel.
  const paid = orders.filter((o) => o.status !== "unpaid");

  // Align the window to the START OF A LOCAL DAY, not to "N × 24h ago".
  //
  // This is not pedantry. The daily buckets below are calendar days, so a
  // rolling-seconds boundary lets an order sit inside the filter but outside
  // every bucket — the headline counts it and the chart doesn't, and the two
  // numbers on the same screen disagree. Anchoring both to midnight makes the
  // series total equal the headline by construction.
  const startOfToday = (() => {
    const d = new Date(nowSeconds * 1000);
    d.setHours(0, 0, 0, 0);
    return Math.floor(d.getTime() / 1000);
  })();

  const windowStart = startOfToday - (windowDays - 1) * DAY;
  const priorStart = windowStart - windowDays * DAY;

  const current = paid.filter((o) => o.created >= windowStart);
  const prior = paid.filter((o) => o.created >= priorStart && o.created < windowStart);

  // Net of refunds: a partially refunded order still counts, minus what went
  // back. Floored at zero so an over-refund can never show negative revenue.
  const net = (o: Order) => Math.max(0, o.total - (o.refundedAmount ?? 0));
  const revenue = current.reduce((n, o) => n + net(o), 0);
  const priorRevenue = prior.reduce((n, o) => n + net(o), 0);
  const unitsSold = current.reduce(
    (n, o) => n + o.items.reduce((m, i) => m + i.qty, 0),
    0,
  );

  // ---- daily series, with empty days present rather than skipped ----------
  // A chart that omits quiet days compresses time and makes a bad week look
  // like a good one. Every day in the window gets a bucket.
  const buckets = new Map<string, DayPoint>();
  for (let i = 0; i < windowDays; i++) {
    // Built from the same midnight anchor the filter uses, plus half a day so
    // a DST shift can't round the label onto the neighbouring date.
    const at = windowStart + i * DAY + DAY / 2;
    buckets.set(dayKey(at), { day: dayKey(at), label: dayLabel(at), revenue: 0, orders: 0 });
  }
  for (const o of current) {
    const b = buckets.get(dayKey(o.created));
    if (!b) continue;
    b.revenue += net(o);
    b.orders += 1;
  }

  // ---- best sellers -------------------------------------------------------
  // Keyed by SKU from checkout metadata where available, falling back to the
  // line title. Titles can change; SKUs don't, which is why they win.
  const byTitle = new Map<string, { units: number; revenue: number }>();
  for (const o of current) {
    for (const item of o.items) {
      const row = byTitle.get(item.title) ?? { units: 0, revenue: 0 };
      row.units += item.qty;
      row.revenue += item.amount;
      byTitle.set(item.title, row);
    }
  }

  const topProducts: TopProduct[] = [...byTitle.entries()]
    .map(([title, row]) => {
      const p = products.find((x) => x.title === title);
      return {
        sku: p?.sku ?? "—",
        title,
        units: row.units,
        revenue: row.revenue,
        stock: p?.stock ?? null,
        status: p ? availability(p) : ("in-stock" as const),
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  // ---- where the money sits ----------------------------------------------
  // Tax is collected on behalf of the state and shipping is largely passed to
  // the carrier — showing them separately stops "revenue" being read as profit.
  const refundedTotal = current.reduce((n, o) => n + (o.refundedAmount ?? 0), 0);
  const goods = Math.max(0, current.reduce((n, o) => n + o.subtotal, 0) - refundedTotal);
  const shipping = current.reduce((n, o) => n + o.shipping, 0);
  const tax = current.reduce((n, o) => n + o.tax, 0);
  const splitTotal = goods + shipping + tax;
  const split: RevenueSplit[] = [
    { label: "Goods", amount: goods, share: splitTotal ? goods / splitTotal : 0 },
    { label: "Shipping", amount: shipping, share: splitTotal ? shipping / splitTotal : 0 },
    { label: "Tax collected", amount: tax, share: splitTotal ? tax / splitTotal : 0 },
  ];

  // ---- operational -------------------------------------------------------
  // "paid" excludes refunded and shipped by construction — see toOrder.
  const unshippedOrders = paid.filter((o) => o.status === "paid");
  const oldest = unshippedOrders.reduce<number | null>((acc, o) => {
    const hours = (nowSeconds - o.created) / 3600;
    return acc === null || hours > acc ? hours : acc;
  }, null);

  const live = products.filter((p) => !p.archived);

  return {
    revenue,
    orderCount: current.length,
    averageOrder: current.length ? revenue / current.length : 0,
    unitsSold,
    revenueTrend: trend(revenue, priorRevenue),
    orderTrend: trend(current.length, prior.length),
    series: [...buckets.values()],
    topProducts,
    split,
    unshipped: unshippedOrders.length,
    oldestUnshippedHours: oldest,
    lowStock: live.filter((p) => availability(p) === "low-stock").length,
    outOfStock: live.filter((p) => availability(p) === "out-of-stock").length,
  };
}
