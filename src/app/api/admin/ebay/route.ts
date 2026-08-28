import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AccessError } from "@/lib/access";
import { fetchSellerListings, planImport, EbayNotConfigured } from "@/lib/ebay";
import { allProducts } from "@/lib/catalog";
import { site } from "@/lib/site";

/**
 * Reads the eBay store and reports what an import WOULD do.
 *
 * Read-only by design. This endpoint never writes a product, never downloads an
 * image and never changes stock — it fetches, matches, and hands back a plan.
 * Importing photos and quantities is a separate, explicit step, because an
 * import that runs itself is an import that overwrites the wrong thing at the
 * wrong moment.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof AccessError ? err.message : "Not authorised." },
      { status: 403 },
    );
  }

  let body: { seller?: string };
  try {
    body = (await req.json()) as { seller?: string };
  } catch {
    body = {};
  }

  // Default to the store named in site config; allow an override for testing
  // against a different account.
  const seller =
    (body.seller ?? "").trim() ||
    site.external.ebay.split("/str/")[1]?.split(/[/?]/)[0] ||
    "";

  if (!seller) {
    return NextResponse.json(
      { error: "No eBay seller name. Set one in site.external.ebay or pass it explicitly." },
      { status: 400 },
    );
  }

  try {
    const { listings, truncated } = await fetchSellerListings(seller);
    const products = (await allProducts()).filter((p) => !p.archived);
    const plan = planImport(
      listings,
      products.map((p) => ({ sku: p.sku, title: p.title, price: p.price })),
    );

    return NextResponse.json({
      ok: true,
      seller,
      total: listings.length,
      truncated,
      matched: plan.matched.map((m) => ({
        sku: m.sku,
        reasons: m.reasons,
        title: m.listing.title,
        price: m.listing.price,
        images: m.listing.images.length,
        firstImage: m.listing.images[0] ?? null,
        // The full list, because the apply step writes exactly what was
        // reviewed rather than re-deriving it from a second eBay call.
        imageUrls: m.listing.images,
        quantity: m.listing.availableQuantity,
        url: m.listing.itemWebUrl,
      })),
      unmatched: plan.unmatched.map((l) => ({
        title: l.title,
        price: l.price,
        images: l.images.length,
        firstImage: l.images[0] ?? null,
        quantity: l.availableQuantity,
        url: l.itemWebUrl,
      })),
    });
  } catch (err) {
    if (err instanceof EbayNotConfigured) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
