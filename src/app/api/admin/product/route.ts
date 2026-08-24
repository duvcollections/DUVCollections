import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AccessError } from "@/lib/access";
import { requestRedeploy } from "@/lib/redeploy";
import { upsertProduct, setArchived, seedCatalogue, slugify, NoDatabase } from "@/lib/products-repo";
import { checkImageUrl, MAX_IMAGES } from "@/lib/product-images";
import { allProducts, type Product, type CategoryId } from "@/lib/catalog";

const CATEGORIES = ["printing-supplies", "jewelry", "eyewear"];

/** Parses "Name: value" lines into an object, ignoring blanks. */
function parseSpecs(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const i = line.indexOf(":");
    if (i < 1) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim();
    if (k && v) out[k] = v;
  }
  return out;
}

export async function POST(req: NextRequest) {
  let actor: string;
  try {
    actor = (await requireAdmin()).email;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof AccessError ? err.message : "Not authorised." },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    // ---------------------------------------------------------------- seed
    if (body.action === "seed") {
      const { inserted } = await seedCatalogue(actor);
    const rebuild = await requestRedeploy();
    return NextResponse.json({ ok: true, inserted, rebuild });
    }

    // ------------------------------------------------------------- archive
    if (body.action === "archive") {
      const sku = String(body.sku ?? "");
      if (!sku) return NextResponse.json({ error: "SKU required." }, { status: 400 });
      await setArchived(sku, Boolean(body.archived), actor);
    const rebuild = await requestRedeploy();
    return NextResponse.json({ ok: true, rebuild });
    }

    // ---------------------------------------------------------------- save
    if (body.action === "save") {
      const f = body.product as Record<string, string | boolean>;
      const isNew = Boolean(body.isNew);

      const sku = String(f.sku ?? "").trim().toUpperCase();
      if (!/^[A-Z0-9][A-Z0-9-]{1,31}$/.test(sku)) {
        return NextResponse.json(
          { error: "SKU must be 2–32 characters: letters, numbers and dashes." },
          { status: 400 },
        );
      }

      const title = String(f.title ?? "").trim();
      if (title.length < 3) return NextResponse.json({ error: "Title is too short." }, { status: 400 });

      const price = Number(f.price);
      if (!Number.isFinite(price) || price < 0 || price > 100000) {
        return NextResponse.json({ error: "Price must be a number between 0 and 100000." }, { status: 400 });
      }

      const category = String(f.category ?? "");
      if (!CATEGORIES.includes(category)) {
        return NextResponse.json({ error: "Unknown category." }, { status: 400 });
      }

      const upcRaw = String(f.upc ?? "").trim();
      if (upcRaw && !/^\d{12,13}$/.test(upcRaw)) {
        return NextResponse.json(
          { error: "A UPC must be 12 or 13 digits. Leave it blank if you don't have a real one." },
          { status: 400 },
        );
      }

      // Cost price: blank means "not recorded", which reports handle honestly.
      const costRaw = String(f.costPrice ?? "").trim();
      const costPrice = costRaw === "" ? null : Number(costRaw);
      if (costPrice !== null && (!Number.isFinite(costPrice) || costPrice < 0 || costPrice > 100000)) {
        return NextResponse.json(
          { error: "Cost price must be a number between 0 and 100000, or blank." },
          { status: 400 },
        );
      }

      // Images are re-validated here even though the browser checked them.
      // The browser check is a courtesy; this one is the boundary.
      const rawImages = Array.isArray((body.product as Record<string, unknown>)?.images)
        ? ((body.product as Record<string, unknown>).images as unknown[])
        : [];
      const productImages: string[] = [];
      for (const candidate of rawImages.slice(0, MAX_IMAGES)) {
        if (typeof candidate !== "string") continue;
        const checked = checkImageUrl(candidate);
        if (!checked.ok) {
          return NextResponse.json(
            { error: `Image rejected: ${checked.error}` },
            { status: 400 },
          );
        }
        productImages.push(checked.url);
      }

      const stockRaw = String(f.stock ?? "").trim();
      const stock = stockRaw === "" ? null : Number(stockRaw);
      if (stock !== null && (!Number.isInteger(stock) || stock < 0)) {
        return NextResponse.json({ error: "Stock must be a whole number, or blank." }, { status: 400 });
      }

      const existing = await allProducts();
      if (isNew && existing.some((p) => p.sku === sku)) {
        return NextResponse.json({ error: `${sku} already exists.` }, { status: 409 });
      }

      // Keep slugs unique — two products sharing a URL would shadow each other.
      const base = slugify(title);
      let slug = base;
      let n = 2;
      while (existing.some((p) => p.slug === slug && p.sku !== sku)) slug = `${base}-${n++}`;

      const highlights = String(f.highlights ?? "")
        .split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 12);

      const description = String(f.description ?? "").trim();

      const product: Product = {
        sku,
        slug,
        title,
        price: Math.round(price * 100) / 100,
        category: category as CategoryId,
        subcategory: String(f.subcategory ?? "").trim().toLowerCase() || "other",
        description,
        highlights,
        goodFor: String(f.goodFor ?? "").trim(),
        specs: parseSpecs(String(f.specs ?? "")),
        art: String(f.art ?? "generic"),
        seoTitle: title.length <= 55 ? title : `${title.slice(0, 52).trimEnd()}…`,
        metaDescription:
          (description.split(". ")[0] || title).slice(0, 120) + " Ships free over $75 from the USA.",
        keywords: [...new Set(
          `${title} ${String(f.subcategory ?? "")}`.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [],
        )].slice(0, 10),
        stock,
        lowStockAt: Math.max(0, Number(f.lowStockAt) || 5),
        upc: upcRaw || null,
        mpn: sku,
        shipWeightOz: Math.max(0.1, Number(f.shipWeightOz) || 4),
        wholesale: Boolean(f.wholesale),
        condition: "new",
        archived: false,
        costPrice,
        images: productImages,
      };

      await upsertProduct(product, actor);
      console.log(`[admin] ${actor} ${isNew ? "created" : "updated"} ${sku}`);
    const rebuild = await requestRedeploy();
    return NextResponse.json({ ok: true, sku, slug, rebuild });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    if (err instanceof NoDatabase) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error("[admin] product mutation failed:", err);
    return NextResponse.json({ error: "Something went wrong saving that." }, { status: 500 });
  }
}
