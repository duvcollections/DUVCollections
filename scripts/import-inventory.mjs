/**
 * Reads inventory/products.csv back into the catalogue.
 * Only touches stock, lowStockAt, upc, price and shipWeightOz — never titles or
 * descriptions, so an accidental spreadsheet edit can't mangle your copy.
 *
 *   node scripts/import-inventory.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((x) => x !== ""));
}

const csv = parseCsv(readFileSync("inventory/products.csv", "utf8"));
const header = csv[0];
const idx = (name) => header.indexOf(name);

const products = JSON.parse(readFileSync("src/data/products.json", "utf8"));
const bySku = new Map(products.map((p) => [p.sku, p]));

const warn = [];
let changed = 0;

for (const row of csv.slice(1)) {
  const sku = row[idx("sku")]?.trim();
  const p = bySku.get(sku);
  if (!p) { warn.push(`Unknown SKU in CSV, skipped: ${sku}`); continue; }

  const num = (name) => {
    const raw = row[idx(name)]?.trim();
    if (raw === "" || raw === undefined) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  const stock = num("stock");
  if (stock !== p.stock) { p.stock = stock; changed++; }

  const low = num("lowStockAt");
  if (low !== null && low !== p.lowStockAt) { p.lowStockAt = low; changed++; }

  const price = num("price");
  if (price !== null && price !== p.price) { p.price = price; changed++; }

  const wt = num("shipWeightOz");
  if (wt !== null && wt !== p.shipWeightOz) { p.shipWeightOz = wt; changed++; }

  const upc = row[idx("upc")]?.trim() || null;
  if (upc !== p.upc) {
    // A real UPC-A is 12 digits; EAN-13 is 13. Anything else is almost certainly
    // a typo or a made-up number, and a bad barcode is worse than none.
    if (upc && !/^\d{12,13}$/.test(upc)) {
      warn.push(`${sku}: "${upc}" is not a valid 12- or 13-digit barcode — left blank.`);
    } else {
      p.upc = upc;
      changed++;
    }
  }
}

writeFileSync("src/data/products.json", JSON.stringify(products, null, 2) + "\n");
console.log(`Updated ${changed} field(s) across ${products.length} products.`);
if (warn.length) {
  console.log("\nWarnings:");
  for (const w of warn) console.log("  ! " + w);
}
const uncounted = products.filter((p) => p.stock === null).length;
if (uncounted) console.log(`\n${uncounted} product(s) still have no stock count.`);
