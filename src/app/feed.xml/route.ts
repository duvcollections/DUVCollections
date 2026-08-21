import { getProducts } from "@/lib/catalog";
import { photosFor } from "@/components/ProductImage";
import { productsForFeed, buildFeed } from "@/lib/feed";

/**
 * /feed.xml — the URL you give Google Merchant Center.
 *
 * Cached for an hour. Google fetches this on its own schedule (typically daily),
 * so serving a slightly stale copy costs nothing and keeps the Worker from
 * rebuilding the whole catalogue for every crawler that wanders past.
 */
export const revalidate = 3600;

export async function GET() {
  const items = productsForFeed(await getProducts(), photosFor);
  return new Response(buildFeed(items), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
