/**
 * Shipping rate tests.
 *
 * Run: npx tsx scripts/test-shipping-rates.ts
 *
 * These decide what a customer is charged, so every case below is either a way
 * to overcharge someone or a way to lose money silently.
 */

import {
  quoteShipping,
  cartWeightOz,
  bandFor,
  rateHealth,
  RATE_BANDS,
  describeWeight,
} from "../src/lib/shipping-rates";
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

const product = (sku: string, oz: number, price = 10): Product =>
  ({
    sku,
    slug: sku.toLowerCase(),
    title: sku,
    price,
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
    mpn: sku,
    shipWeightOz: oz,
    wholesale: false,
    condition: "new",
    archived: false,
    goodFor: "",
  }) as unknown as Product;

const CATALOG = [
  product("LIGHT", 1, 8), // a pendant
  product("MED", 20, 15), // a tub of powder
  product("HEAVY", 96, 80), // the DTF roll — the one that was losing money
];

console.log("\nbands are monotonic and never priced below cost");
{
  let lastMax = -1;
  let lastPrice = -1;
  let ordered = true;
  let profitable = true;
  for (const b of RATE_BANDS) {
    if (b.maxOz <= lastMax) ordered = false;
    if (b.price <= lastPrice) ordered = false;
    if (b.price <= b.estimatedCost) profitable = false;
    lastMax = b.maxOz;
    lastPrice = b.price;
  }
  check("bands ascend by weight and price", ordered, true);
  check("every band charges above its estimated cost", profitable, true);
  check("top band catches everything", RATE_BANDS[RATE_BANDS.length - 1].maxOz, Infinity);
}

console.log("\ncart weight");
{
  check("empty cart weighs nothing", cartWeightOz([], CATALOG), 0);
  check("single light item + packaging", cartWeightOz([{ sku: "LIGHT", qty: 1 }], CATALOG), 4);
  check("quantity multiplies", cartWeightOz([{ sku: "LIGHT", qty: 5 }], CATALOG), 8);
  check(
    "mixed cart sums",
    cartWeightOz([{ sku: "LIGHT", qty: 2 }, { sku: "MED", qty: 1 }], CATALOG),
    25,
  );
  // An unknown SKU must not weigh zero, or a basket of them ships in the
  // cheapest band and costs several times what it charged.
  check("unknown SKU uses the default weight, not zero", cartWeightOz([{ sku: "???", qty: 1 }], CATALOG), 7);
}

console.log("\nband selection");
{
  check("4 oz sits in the first band", bandFor(4).price, RATE_BANDS[0].price);
  check("boundary is inclusive", bandFor(RATE_BANDS[0].maxOz).price, RATE_BANDS[0].price);
  check("just over the boundary moves up", bandFor(RATE_BANDS[0].maxOz + 0.1).price, RATE_BANDS[1].price);
  check("absurd weight still returns a band", bandFor(10_000).price, RATE_BANDS[RATE_BANDS.length - 1].price);
}

console.log("\nthe bug this was built to fix");
{
  // $80 roll, six pounds. Under the old rule this shipped FREE and cost ~$12.60.
  const q = quoteShipping([{ sku: "HEAVY", qty: 1 }], CATALOG, 80);
  check("heavy order over $75 is NOT free", q.free, false);
  check("heavy order is charged the heavy band", q.amount, 1799);
  check("charge exceeds estimated cost", q.amount / 100 > q.estimatedCost, true);
}

console.log("\nfree shipping still works where it should");
{
  // Light basket, over the spend threshold: free, and cheap to give away.
  const q = quoteShipping([{ sku: "LIGHT", qty: 10 }], CATALOG, 80);
  check("light order over $75 ships free", q.free, true);
  check("free means zero", q.amount, 0);

  const under = quoteShipping([{ sku: "LIGHT", qty: 1 }], CATALOG, 8);
  check("under the threshold is charged", under.free, false);
  check("light single item gets the cheapest band", under.amount, 499);
}

console.log("\nedge cases");
{
  check("empty cart is free by default", quoteShipping([], CATALOG, 0).amount, 499);
  const many = quoteShipping([{ sku: "MED", qty: 20 }], CATALOG, 300);
  check("20 tubs is not free despite a big spend", many.free, false);
  check("very heavy basket lands in the top band", many.amount, 2299);
}

console.log("\nrate health (post-label reconciliation)");
{
  check("profitable label", rateHealth(9.99, 7.6).losing, false);
  check("loss detected", rateHealth(5.99, 12.6).losing, true);
  check("loss is significant", rateHealth(5.99, 12.6).significant, true);
  check("tiny difference is noise", rateHealth(9.99, 9.5).significant, false);
  check("margin maths", Math.round(rateHealth(9.99, 7.6).margin * 100) / 100, 2.39);
}

console.log("\nweight formatting");
{
  check("ounces under a pound", describeWeight(12), "12 oz");
  check("pounds above", describeWeight(32), "2.0 lb");
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
