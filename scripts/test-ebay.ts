/**
 * eBay import matching tests.
 *
 * Run: npx tsx scripts/test-ebay.ts
 *
 * A wrong match writes someone else's photo onto your product, so these cases
 * are mostly about refusing to guess.
 */
import { planImport, type EbayListing } from "../src/lib/ebay";

let pass = 0, fail = 0;
const check = (name: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}\n         expected ${e}\n         actual   ${a}`); }
};

const listing = (title: string, price: number | null, itemId = "v1|1|0"): EbayListing => ({
  itemId, title, price, currency: "USD", images: ["https://i.ebayimg.com/x/s-l500.jpg"],
  condition: "New", categoryPath: "Jewelry", itemWebUrl: "https://ebay.com/itm/1",
  availableQuantity: 5,
});

const PRODUCTS = [
  { sku: "PND003", title: "Flower with Ganesha Pendant — PND003", price: 7.99 },
  { sku: "CH004", title: "Gold Plated Chain 33 in — CH004", price: 21 },
  { sku: "DTF-POWDER-500", title: "OtterPro DTF Powder — 500 g", price: 15 },
];

console.log("\nexplicit SKU in the title is the strongest signal");
{
  const p = planImport([listing("Flower with Ganesha Pendant PND003 Gold", 7.99)], PRODUCTS);
  check("matched", p.matched.length, 1);
  check("to the right SKU", p.matched[0]?.sku, "PND003");
}

console.log("\nstrong title overlap plus exact price");
{
  const p = planImport([listing("OtterPro DTF Powder 500 g Hot Melt", 15)], PRODUCTS);
  check("matched on title + price", p.matched[0]?.sku, "DTF-POWDER-500");
}

console.log("\nrefuses to guess");
{
  const p = planImport([listing("Random Unrelated Phone Case", 12)], PRODUCTS);
  check("no match for unrelated item", p.matched.length, 0);
  check("reported as unmatched", p.unmatched.length, 1);
}

console.log("\nprice far off vetoes a TITLE-ONLY match");
{
  // CH004's SKU does not appear in this title, so only word overlap connects
  // them — and a 10x price gap means it is a different chain, not this one.
  const p = planImport([listing("Gold Plated Chain 33 in", 210)], PRODUCTS);
  check("not matched on title alone at 10x price", p.matched.length, 0);
  check("reported as unmatched instead", p.unmatched.length, 1);
}

console.log("\nbut an explicit SKU overrides the price veto");
{
  // My first version of this test was wrong: "DTF-POWDER-500" normalises to
  // "dtf powder 500", which really is present in the title — so this is a
  // SKU-stated match, and a price gap is then a pricing question for a human
  // rather than a reason to refuse the match.
  const p = planImport([listing("OtterPro DTF Powder 500 g", 150)], PRODUCTS);
  check("SKU in title still matches", p.matched[0]?.sku, "DTF-POWDER-500");
}

console.log("\none SKU cannot be claimed twice");
{
  const p = planImport(
    [listing("Flower with Ganesha Pendant PND003", 7.99, "a"),
     listing("Flower with Ganesha Pendant PND003 second listing", 7.99, "b")],
    PRODUCTS,
  );
  check("only one match", p.matched.length, 1);
  check("the other is unmatched", p.unmatched.length, 1);
}

console.log("\nedge cases");
{
  check("no listings", planImport([], PRODUCTS).matched.length, 0);
  check("no products", planImport([listing("Anything", 5)], []).unmatched.length, 1);
  const noPrice = planImport([listing("Flower with Ganesha Pendant PND003", null)], PRODUCTS);
  check("missing price still matches on SKU", noPrice.matched[0]?.sku, "PND003");
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
