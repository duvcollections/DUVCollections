/**
 * Turn a folder of product photos into optimised web images.
 *
 *   1. Drop photos into  inventory/photos/
 *   2. Name each file so it contains the SKU — "CH004.jpg", "ch004-front.png",
 *      "DTF ROLL 30 100 (2).jpeg" all work. Separators and case are ignored.
 *   3. Run:  npm run images:ingest
 *
 * Produces public/products/<sku>.webp (1400px, square, white background) plus a
 * 600px thumbnail, and writes the manifest the site reads. Extra photos of the
 * same SKU become -2, -3 and so on.
 *
 * Photos are never uploaded anywhere — this runs entirely on your machine.
 */
import { readdirSync, statSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, extname, basename } from "node:path";
import sharp from "sharp";

const SRC = "inventory/photos";
const OUT = "public/products";
const EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".heic", ".avif"]);

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const products = JSON.parse(readFileSync("src/data/products.json", "utf8"));
// Longest SKUs first, so "DTF-GLIT-A3-GOLD" wins over a shorter prefix
const skus = products.map((p) => p.sku).sort((a, b) => b.length - a.length);
const skuKeys = skus.map((s) => [s, norm(s)]);

function walk(dir) {
  let out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out = out.concat(walk(full));
    else if (EXT.has(extname(name).toLowerCase())) out.push(full);
  }
  return out;
}

mkdirSync(OUT, { recursive: true });
mkdirSync(SRC, { recursive: true });

const files = walk(SRC);
if (files.length === 0) {
  console.log(`No images found in ${SRC}/.`);
  console.log("Drop your product photos there, named so each filename contains its SKU.");
  process.exit(0);
}

const matched = new Map();   // sku -> [filepath]
const unmatched = [];

for (const f of files) {
  const key = norm(basename(f, extname(f)));
  const hit = skuKeys.find(([, k]) => key.includes(k));
  if (!hit) { unmatched.push(f); continue; }
  const list = matched.get(hit[0]) ?? [];
  list.push(f);
  matched.set(hit[0], list);
}

const manifest = {};
let written = 0;

for (const [sku, list] of matched) {
  list.sort();
  const names = [];
  for (let i = 0; i < list.length; i++) {
    const suffix = i === 0 ? "" : `-${i + 1}`;
    const name = `${sku}${suffix}`;
    const base = sharp(list[i]).rotate();

    await base
      .clone()
      .resize(1400, 1400, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
      .webp({ quality: 82 })
      .toFile(join(OUT, `${name}.webp`));

    await base
      .clone()
      .resize(600, 600, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
      .webp({ quality: 78 })
      .toFile(join(OUT, `${name}-sm.webp`));

    names.push(name);
    written += 2;
  }
  manifest[sku] = names;
}

writeFileSync("src/data/product-images.json", JSON.stringify(manifest, null, 2) + "\n");

const missing = skus.filter((s) => !manifest[s]);
console.log(`\n✓ ${written} image files written to ${OUT}/`);
console.log(`✓ ${Object.keys(manifest).length} of ${skus.length} products now have photos`);

if (unmatched.length) {
  console.log(`\n! ${unmatched.length} file(s) had no SKU in the filename and were skipped:`);
  for (const f of unmatched.slice(0, 15)) console.log("   " + f);
  if (unmatched.length > 15) console.log(`   …and ${unmatched.length - 15} more`);
}
if (missing.length) {
  console.log(`\n· ${missing.length} product(s) still have no photo — they keep the illustration:`);
  console.log("   " + missing.slice(0, 20).join(", ") + (missing.length > 20 ? " …" : ""));
}
console.log("");
