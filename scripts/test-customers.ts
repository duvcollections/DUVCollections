/**
 * Customer value and profit tests.
 *
 * Run: npx tsx scripts/test-customers.ts
 *
 * These figures get used to decide what to restock and what to charge, so the
 * cases below are mostly about refusing to report a number we cannot justify.
 */

import {
  customerStats,
  orderProfit,
  profitSummary,
  median,
} from "../src/lib/customer-stats";
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

const NOW = 1_760_000_000;
const DAY = 86_400;

const order = (over: Partial<Order> & { created: number }): Order => ({
  id: `cs_${over.created}_${over.email ?? "x"}`,
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
  items: [],
  carrier: null,
  tracking: null,
  shippedAt: null,
  paymentIntentId: "pi",
  skus: [],
  refundedAmount: 0,
  labelUrl: null,
  labelCost: null,
  ...over,
});

const product = (sku: string, costPrice: number | null): Product =>
  ({
    sku, slug: sku.toLowerCase(), title: sku, price: 20, category: "jewelry",
    subcategory: "x", description: "d", highlights: [], goodFor: "", specs: {},
    art: "generic", seoTitle: "t", metaDescription: "m", keywords: [],
    stock: 10, lowStockAt: 3, upc: null, mpn: sku, shipWeightOz: 4,
    wholesale: false, condition: "new", archived: false, costPrice,
  }) as unknown as Product;

console.log("\nmedian");
check("empty is null, not zero", median([]), null);
check("odd count", median([1, 9, 5]), 5);
check("even count averages the middle", median([1, 2, 3, 4]), 2.5);

console.log("\ncustomers are grouped by email");
{
  const s = customerStats([
    order({ created: NOW - 90 * DAY, email: "one@x.com", total: 50 }),
    order({ created: NOW - 60 * DAY, email: "one@x.com", total: 70 }),
    order({ created: NOW - 10 * DAY, email: "two@x.com", total: 30 }),
  ]);
  check("two distinct customers", s.total, 2);
  check("one is a repeat buyer", s.repeat, 1);
  check("repeat rate", s.repeatRate, 0.5);
  check("top customer by spend", s.customers[0].email, "one@x.com");
  check("their spend is summed", s.customers[0].spend, 120);
  check("lifetime value averages across customers", s.lifetimeValue, 75);
  check("average order is per order, not per customer", s.averageOrder, 50);
}

console.log("\nemail matching is case- and space-insensitive");
{
  const s = customerStats([
    order({ created: NOW - 20 * DAY, email: "Same@X.com", total: 10 }),
    order({ created: NOW - 10 * DAY, email: " same@x.com ", total: 10 }),
  ]);
  check("treated as one customer", s.total, 1);
  check("counted as a repeat", s.repeat, 1);
}

console.log("\nrefunds reduce lifetime value");
{
  const s = customerStats([
    order({ created: NOW - 5 * DAY, email: "r@x.com", total: 100, refundedAmount: 40 }),
  ]);
  check("spend is net of the refund", s.customers[0].spend, 60);
}

console.log("\nunpaid and email-less orders are excluded");
{
  const s = customerStats([
    order({ created: NOW - DAY, email: "p@x.com", total: 10 }),
    order({ created: NOW - DAY, email: "u@x.com", total: 999, status: "unpaid" }),
    order({ created: NOW - DAY, email: null, total: 500 }),
  ]);
  check("only the paid, identified order counts", s.total, 1);
  check("revenue excludes the others", s.lifetimeValue, 10);
}

console.log("\ndays between orders");
{
  const s = customerStats([
    order({ created: NOW - 30 * DAY, email: "g@x.com", total: 10 }),
    order({ created: NOW - 20 * DAY, email: "g@x.com", total: 10 }),
    order({ created: NOW - 5 * DAY, email: "g@x.com", total: 10 }),
  ]);
  // Gaps are 10 and 15 days — mean 12.5, not (30-5)/3.
  check("mean of actual gaps", Math.round((s.customers[0].daysBetween ?? 0) * 10) / 10, 12.5);
  check("median across all gaps", s.medianDaysBetween, 12.5);
  const one = customerStats([order({ created: NOW - DAY, email: "o@x.com" })]);
  check("one-time buyer has no gap", one.customers[0].daysBetween, null);
  check("and no median exists", one.medianDaysBetween, null);
}

console.log("\nprofit refuses to guess");
{
  const products = [product("A", 4), product("B", null)];

  const known = orderProfit(
    order({ created: NOW, total: 100, shipping: 10, skus: [{ sku: "A", qty: 2 }] }),
    products,
    6,
  );
  check("cogs computed", known.cogs, 8);
  check("stripe fee applied", Math.round(known.stripeFee * 100) / 100, 3.2);
  check("profit = 100 - 8 - 6 - 3.20", Math.round((known.profit ?? 0) * 100) / 100, 82.8);

  const noCost = orderProfit(
    order({ created: NOW, total: 100, skus: [{ sku: "B", qty: 1 }] }),
    products,
    6,
  );
  check("missing cost price means no cogs", noCost.cogs, null);
  check("and therefore no profit", noCost.profit, null);
  check("the offending SKU is named", noCost.missingCost, ["B"]);

  const noShip = orderProfit(
    order({ created: NOW, total: 100, skus: [{ sku: "A", qty: 1 }] }),
    products,
    null,
  );
  check("unknown label cost also blocks profit", noShip.profit, null);

  const noSkus = orderProfit(order({ created: NOW, total: 100, skus: [] }), products, 5);
  check("an order with no SKUs has unknowable cost", noSkus.cogs, null);

  // A partly-costed order must not report the partial sum as if it were whole.
  const partial = orderProfit(
    order({ created: NOW, total: 100, skus: [{ sku: "A", qty: 1 }, { sku: "B", qty: 1 }] }),
    products,
    5,
  );
  check("partial costing yields null, not a half total", partial.cogs, null);
}

console.log("\nprofit summary separates known from unknown");
{
  const products = [product("A", 4), product("B", null)];
  const rows = [
    orderProfit(order({ created: NOW, total: 100, skus: [{ sku: "A", qty: 1 }] }), products, 5),
    orderProfit(order({ created: NOW, total: 50, skus: [{ sku: "B", qty: 1 }] }), products, 5),
    orderProfit(order({ created: NOW, total: 80, skus: [{ sku: "B", qty: 2 }] }), products, 5),
  ];
  const s = profitSummary(rows);
  check("one order fully costed", s.complete, 1);
  check("two are not", s.incomplete, 2);
  check("revenue counts everything", s.revenue, 230);
  check("profit counts only complete orders", Math.round(s.profit * 100) / 100, 87.8);
  check("margin is against complete revenue only", Math.round((s.margin ?? 0) * 1000) / 1000, 0.878);
  check("SKU needing a cost is surfaced", s.needCost[0].sku, "B");
  check("ranked by how often it appears", s.needCost[0].orders, 2);
}

console.log("\nempty shop");
{
  const s = customerStats([]);
  check("no customers", s.total, 0);
  check("LTV is zero, not NaN", s.lifetimeValue, 0);
  check("repeat rate is zero, not NaN", s.repeatRate, 0);
  const p = profitSummary([]);
  check("margin has no value to report", p.margin, null);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
