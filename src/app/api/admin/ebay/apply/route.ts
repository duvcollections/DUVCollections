import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AccessError } from "@/lib/access";
import { setProductImages } from "@/lib/products-repo";
import { allProducts } from "@/lib/catalog";
import { checkImageUrl, MAX_IMAGES } from "@/lib/product-images";
import { requestRedeploy } from "@/lib/redeploy";

/**
 * Writes imported photographs onto products.
 *
 * Split from the scan endpoint on purpose. Scanning is read-only and safe to
 * run on a whim; this changes the live catalogue, so it happens only when
 * someone has looked at the plan and pressed a button.
 *
 * The client sends explicit {sku, images} pairs taken from what the admin
 * actually reviewed. This route deliberately does NOT re-run the matcher and
 * apply its own conclusions: if the matching logic changed between the scan
 * and the click, the shop owner would be approving one thing and saving
 * another. What you saw is what gets written.
 */

type Assignment = { sku: string; images: string[] };

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof AccessError ? err.message : "Not authorised." },
      { status: 403 },
    );
  }

  let body: { assignments?: unknown };
  try {
    body = (await req.json()) as { assignments?: unknown };
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  if (!Array.isArray(body.assignments) || body.assignments.length === 0) {
    return NextResponse.json({ error: "Nothing selected to import." }, { status: 400 });
  }

  // Only SKUs that actually exist may be written. Without this check a typo or
  // a stale browser tab could create rows for products that were archived or
  // renamed since the scan ran.
  const known = new Set((await allProducts()).map((p) => p.sku));

  const actor = "ebay-import";
  const written: { sku: string; count: number }[] = [];
  const skipped: { sku: string; reason: string }[] = [];

  for (const raw of body.assignments as Assignment[]) {
    const sku = typeof raw?.sku === "string" ? raw.sku.trim() : "";
    if (!sku) {
      skipped.push({ sku: "(blank)", reason: "no SKU given" });
      continue;
    }
    if (!known.has(sku)) {
      skipped.push({ sku, reason: "not in the catalogue" });
      continue;
    }

    const candidates = Array.isArray(raw.images) ? raw.images : [];
    const clean: string[] = [];
    let rejected: string | null = null;

    for (const candidate of candidates.slice(0, MAX_IMAGES)) {
      if (typeof candidate !== "string") continue;
      // Re-validated here even though these came from eBay's own API. The
      // browser is not a trust boundary: this endpoint has to hold on its own
      // against a hand-made request.
      const checked = checkImageUrl(candidate);
      if (!checked.ok) {
        rejected = checked.error;
        break;
      }
      clean.push(checked.url);
    }

    if (rejected) {
      skipped.push({ sku, reason: rejected });
      continue;
    }
    if (clean.length === 0) {
      skipped.push({ sku, reason: "no usable image URLs" });
      continue;
    }

    try {
      await setProductImages(sku, clean, actor);
      written.push({ sku, count: clean.length });
    } catch (err) {
      // One bad product must not abandon the rest of the batch half-done.
      skipped.push({ sku, reason: (err as Error).message });
    }
  }

  // Pages read D1 per request, so photos appear immediately. The rebuild is
  // only to refresh the bundled feed caches; a failure here is not an import
  // failure and must not be reported as one.
  const rebuild = written.length > 0 ? await requestRedeploy() : { queued: false };

  return NextResponse.json({
    ok: true,
    written,
    skipped,
    totalImages: written.reduce((n, w) => n + w.count, 0),
    rebuild,
  });
}
