/**
 * Channel feed tests.
 *
 * Run: npx tsx scripts/test-channels.ts
 *
 * These files get uploaded to marketplaces that will happily create real
 * listings from them, so a malformed row becomes a real product for sale.
 */
import { CHANNELS, readiness, metaFeed, ebayFeed, amazonFeed } from "../src/lib/channels";
import type { Product } from "../src/lib/catalog";

let pass = 0, fail = 0;
const check = (name: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}\n         expected ${e}\n         actual   ${a}`); }
};

const product = (over: Partial<Product> & { sku: string }): Product =>
  ({
    slug: over.sku.toLowerCase(), title: "A Product", price: 20, category: "jewelry",
    subcategory: "x", description: "A description long enough to pass the minimum length rule.",
    highlights: [], goodFor: "", specs: {}, art: "generic", seoTitle: "t",
    metaDescription: "m", keywords: [], stock: 10, lowStockAt: 3, upc: "012345678905",
    mpn: over.sku, shipWeightOz: 4, wholesale: false, condition: "new", archived: false,
    ...over,
  }) as unknown as Product;

const withImage = () => true;
const noImage = () => false;
const img = () => "https://i.ebayimg.com/x/s-l1600.jpg";

console.log("\nreadiness: shared rules");
{
  const google = CHANNELS.find((c) => c.id === "google")!;
  check("a complete product is ready", readiness(google, [product({ sku: "A" })], withImage).ready.length, 1);
  check("no photo blocks it", readiness(google, [product({ sku: "A" })], noImage).blocked[0]?.reason, "no photograph");
  check("out of stock blocks it", readiness(google, [product({ sku: "A", stock: 0 })], withImage).blocked[0]?.reason, "out of stock");
  check("thin description blocks it", readiness(google, [product({ sku: "A", description: "short" })], withImage).blocked[0]?.reason, "description too short");
  check("archived is skipped entirely", readiness(google, [product({ sku: "A", archived: true })], withImage).ready.length, 0);
}

console.log("\nreadiness differs per channel");
{
  const noUpc = product({ sku: "A", upc: null });
  const google = CHANNELS.find((c) => c.id === "google")!;
  const amazon = CHANNELS.find((c) => c.id === "amazon")!;
  check("Google accepts a product with no UPC", readiness(google, [noUpc], withImage).ready.length, 1);
  check("Amazon does not", readiness(amazon, [noUpc], withImage).ready.length, 0);
  check("and says why", readiness(amazon, [noUpc], withImage).blocked[0]?.reason, "Amazon requires a real UPC");
}

console.log("\nCSV injection is neutralised");
{
  const nasty = product({ sku: "A", title: "=cmd|'/c calc'!A1" });
  const csv = metaFeed([nasty], img);
  check("formula prefix is escaped", csv.includes("'=cmd"), true);
  const comma = product({ sku: "B", title: 'Chain, 33", gold' });
  const csv2 = metaFeed([comma], img);
  check("quotes and commas are quoted", csv2.includes('"Chain, 33"", gold"'), true);
}

console.log("\nfeeds carry the right shape");
{
  const p = product({ sku: "CH004", price: 21, stock: 7 });
  const meta = metaFeed([p], img);
  check("meta has a header", meta.split("\n")[0].startsWith("id,title"), true);
  check("meta price includes currency", meta.includes("21.00 USD"), true);
  check("meta availability wording", meta.includes("in stock"), true);

  const ebay = ebayFeed([p], img);
  check("ebay action column first", ebay.split("\n")[0].startsWith("*Action"), true);
  check("ebay leaves category blank rather than guessing", ebay.split("\n")[1].split(",")[2], "");
  check("ebay never carries the street address", ebay.includes("Golden Sands"), false);

  const amazon = amazonFeed([p], img);
  check("amazon is tab-delimited", amazon.split("\n")[0].includes("\t"), true);
  const withTabs = product({ sku: "T", description: "Line one\tand\ntwo, long enough to pass." });
  check("tabs in a description do not break columns",
    amazonFeed([withTabs], img).split("\n")[1].split("\t").length,
    amazon.split("\n")[0].split("\t").length);
}

console.log("\nempty catalogue still produces a valid file");
{
  check("meta header only", metaFeed([], img).trim().split("\n").length, 1);
  check("ebay header only", ebayFeed([], img).trim().split("\n").length, 1);
  check("amazon header only", amazonFeed([], img).trim().split("\n").length, 1);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
