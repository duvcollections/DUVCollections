/**
 * Unit tests for the dashboard maths.
 *
 * Run: npx tsx scripts/test-dashboard.ts
 *
 * These matter more than they look. A dashboard that is merely *plausible* is
 * worse than none — it gets trusted and then quietly misinforms every decision
 * made from it. Each case below is a way the numbers could be wrong while still
 * looking right on screen.
 */

import { dashboardStats, trend } from "../src/lib/dashboard-stats";
import type { Order } from "../src/lib/orders-admin";
import type { Product } from "../src/lib/catalog";

let pass = 0;
let fail = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    pass++;
    console.log(`  ok   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}\n         expected ${e}\n         actual   ${a}`);
  }
}

const NOW = 1_760_000_000; // fixed, so tests never depend on the wall clock
const DAY = 86400;

const order = (over: Partial<Order> & { created: number }): Order => ({
  id: `cs_${over.created}`,
  ref: "REF",
  status: "paid",
  email: "a@b.com",
  name: "A B",
  phone: null,
  address: null,
  currency: "usd",
  subtotal: 100,
  shipping: 0,
  tax: 0,
  total: 100,
  items: [{ title: "Thing", qty: 1, amount: 100 }],
  carrier: null,
  tracking: null,
  shippedAt: null,
  paymentIntentId: "pi_1",
  skus: [],
  refundedAmount: 0,
  ...over,
});

const product = (over: Partial<Product> & { sku: string; title: string }): Product =>
  ({
    slug: "s",
    price: 100,
    category: "jewelry",
    subcategory: "x",
    description: "d",
    highlights: [],
    specs: {},
    art: "generic",
    seoTitle: "t",
    metaDescription: "m",
    keywords: [],
    stock: 10,
    lowStockAt: 3,
    upc: null,
    mpn: "m",
    shipWeightOz: 4,
    wholesale: false,
    condition: "new",
    archived: false,
    ...over,
  }) as Product;

console.log("\ntrend()");
check("zero baseline reports null, not Infinity", trend(500, 0).pct, null);
check("zero baseline still shows direction", trend(500, 0).direction, "up");
check("nothing at all is flat", trend(0, 0).direction, "flat");
check("doubling is +100%", trend(200, 100).pct, 100);
check("halving is -50%", trend(50, 100).pct, -50);
check("tiny movement is flat, not noise", trend(100.05, 100).direction, "flat");

console.log("\nrevenue and orders");
{
  const orders = [
    order({ created: NOW - 2 * DAY, total: 150 }),
    order({ created: NOW - 5 * DAY, total: 50 }),
    // Just inside the prior window — must NOT count toward current revenue.
    order({ created: NOW - 40 * DAY, total: 999 }),
  ];
  const s = dashboardStats(orders, [], NOW, 30);
  check("current-window revenue only", s.revenue, 200);
  check("current-window order count", s.orderCount, 2);
  check("average order value", s.averageOrder, 100);
  check("prior window drives the trend", s.revenueTrend.pct, ((200 - 999) / 999) * 100);
}

console.log("\nunpaid orders are not revenue");
{
  const orders = [
    order({ created: NOW - DAY, total: 100 }),
    order({ created: NOW - DAY, total: 5000, status: "unpaid" }),
  ];
  const s = dashboardStats(orders, [], NOW, 30);
  check("unpaid excluded from revenue", s.revenue, 100);
  check("unpaid excluded from count", s.orderCount, 1);
}

console.log("\ndaily series");
{
  const s = dashboardStats([order({ created: NOW - DAY, total: 100 })], [], NOW, 7);
  check("one bucket per day in the window", s.series.length, 7);
  check("quiet days are present, not skipped", s.series.filter((d) => d.revenue === 0).length, 6);
  check("total across buckets matches revenue", s.series.reduce((n, d) => n + d.revenue, 0), 100);
}

console.log("\ntop products");
{
  const orders = [
    order({
      created: NOW - DAY,
      items: [
        { title: "Cheap", qty: 10, amount: 50 },
        { title: "Pricey", qty: 1, amount: 500 },
      ],
    }),
  ];
  const products = [
    product({ sku: "C1", title: "Cheap", stock: 2, lowStockAt: 3 }),
    product({ sku: "P1", title: "Pricey", stock: 0 }),
  ];
  const s = dashboardStats(orders, products, NOW, 30);
  check("ranked by revenue, not unit count", s.topProducts[0].title, "Pricey");
  check("SKU resolved from the catalogue", s.topProducts[0].sku, "P1");
  check("stock status carried through", s.topProducts[0].status, "out-of-stock");
  check("low stock detected", s.topProducts[1].status, "low-stock");
  check("units summed", s.topProducts[1].units, 10);
}

console.log("\nrevenue split");
{
  const orders = [order({ created: NOW - DAY, subtotal: 80, shipping: 6, tax: 14, total: 100 })];
  const s = dashboardStats(orders, [], NOW, 30);
  check("goods share", s.split[0].share, 0.8);
  check("shipping share", s.split[1].share, 0.06);
  check("tax share", s.split[2].share, 0.14);
  check("shares sum to 1", Math.round(s.split.reduce((n, x) => n + x.share, 0) * 1000) / 1000, 1);
}

console.log("\nempty shop does not divide by zero");
{
  const s = dashboardStats([], [], NOW, 30);
  check("average of nothing is zero", s.averageOrder, 0);
  check("no revenue", s.revenue, 0);
  check("split shares are zero, not NaN", s.split[0].share, 0);
  check("trend has no baseline", s.revenueTrend.pct, null);
}

console.log("\noperational counts");
{
  const orders = [
    order({ created: NOW - 3 * DAY, status: "paid" }),
    order({ created: NOW - DAY, status: "shipped" }),
  ];
  const products = [
    product({ sku: "A", title: "A", stock: 1, lowStockAt: 3 }),
    product({ sku: "B", title: "B", stock: 0 }),
    product({ sku: "C", title: "C", stock: 50 }),
    product({ sku: "D", title: "D", stock: 0, archived: true }),
  ];
  const s = dashboardStats(orders, products, NOW, 30);
  check("awaiting dispatch", s.unshipped, 1);
  check("oldest wait in hours", Math.round(s.oldestUnshippedHours ?? 0), 72);
  check("low stock counted", s.lowStock, 1);
  check("archived not counted as out of stock", s.outOfStock, 1);
}


console.log("\nseries reconciles with the headline (regression)");
{
  // This is the bug the screenshot caught: the filter admitted orders from
  // "30 x 24h ago" while the buckets covered 30 calendar days, so the oldest
  // day's orders counted in the headline but vanished from the chart. The two
  // totals must agree for every window length and every offset.
  for (const windowDays of [7, 30, 90]) {
    const orders = [];
    for (let d = 0; d < windowDays + 5; d++) {
      orders.push(order({ created: NOW - d * DAY, total: 10 }));
      // Two per day, one near midnight, to catch boundary rounding.
      orders.push(order({ created: NOW - d * DAY - 3600 * 23, total: 5 }));
    }
    const s = dashboardStats(orders, [], NOW, windowDays);
    const seriesRevenue = Math.round(s.series.reduce((n, x) => n + x.revenue, 0) * 100) / 100;
    const seriesOrders = s.series.reduce((n, x) => n + x.orders, 0);
    check(`${windowDays}d: series revenue equals headline`, seriesRevenue, Math.round(s.revenue * 100) / 100);
    check(`${windowDays}d: series orders equal headline`, seriesOrders, s.orderCount);
  }
}


console.log("\nrefunds leave the queue and the revenue");
{
  // The bug this covers: a refunded Checkout Session still reports
  // payment_status "paid", so a refunded order sat in "needs packing" forever
  // and kept counting as income.
  const orders = [
    order({ created: NOW - DAY, total: 100 }),
    order({ created: NOW - DAY, total: 250, status: "refunded", refundedAmount: 250 }),
    order({ created: NOW - DAY, total: 80, refundedAmount: 30 }), // partial
  ];
  const s = dashboardStats(orders, [], NOW, 30);
  check("full refund removed from revenue", s.revenue, 150);      // 100 + (80-30)
  check("refunded order not awaiting dispatch", s.unshipped, 2);  // the other two
  check("series still reconciles with headline",
    Math.round(s.series.reduce((n, x) => n + x.revenue, 0) * 100) / 100,
    Math.round(s.revenue * 100) / 100);
}

console.log("\nover-refund cannot go negative");
{
  const orders = [order({ created: NOW - DAY, total: 50, refundedAmount: 80 })];
  const s = dashboardStats(orders, [], NOW, 30);
  check("revenue floored at zero", s.revenue, 0);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
