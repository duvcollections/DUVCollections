/**
 * Writes inventory/products.csv from the catalogue.
 * Open it in Excel, fill in Stock and UPC, then run `npm run inventory:import`.
 *
 *   node scripts/export-inventory.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const products = JSON.parse(readFileSync("src/data/products.json", "utf8"));

const COLS = [
  "sku", "title", "category", "subcategory", "price",
  "stock", "lowStockAt", "upc", "mpn", "shipWeightOz", "condition",
];

const esc = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const rows = [COLS.join(",")];
for (const p of products) rows.push(COLS.map((c) => esc(p[c])).join(","));

writeFileSync("inventory/products.csv", rows.join("\n") + "\n");
console.log(`Wrote inventory/products.csv — ${products.length} products`);
