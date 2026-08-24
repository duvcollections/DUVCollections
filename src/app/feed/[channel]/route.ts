import { getProducts } from "@/lib/catalog";
import { photosFor } from "@/components/ProductImage";
import { getChannel, readiness, metaFeed, ebayFeed, amazonFeed } from "@/lib/channels";
import { site } from "@/lib/site";
import type { Product } from "@/lib/catalog";

/**
 * Per-channel product feeds.
 *
 * Public on purpose: Meta and Google fetch these on a schedule with no
 * credentials, so a login would break the integration. Nothing here is secret
 * — it is the same catalogue the shop already shows, in the shape each
 * marketplace expects.
 *
 * Google keeps its own route at /feed.xml because its format is XML rather
 * than a delimited file, and it was built first.
 */

export const revalidate = 3600;

const FILE = new Map([
  ["meta.csv", { id: "meta", type: "text/csv; charset=utf-8" }],
  ["ebay.csv", { id: "ebay", type: "text/csv; charset=utf-8" }],
  ["amazon.txt", { id: "amazon", type: "text/tab-separated-values; charset=utf-8" }],
]);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ channel: string }> },
) {
  const { channel: file } = await params;
  const spec = FILE.get(file);
  if (!spec) return new Response("Unknown feed.", { status: 404 });

  const channel = getChannel(spec.id);
  if (!channel) return new Response("Unknown channel.", { status: 404 });

  const products = await getProducts();
  const hasImage = (p: Product) => photosFor(p.sku, p.images).length > 0;
  const { ready } = readiness(channel, products, hasImage);

  // Absolute URL, because a marketplace fetching this file has no idea what
  // our origin is. A relative path here silently yields broken images.
  const imageUrl = (p: Product) => {
    const first = photosFor(p.sku, p.images)[0];
    if (!first) return "";
    return first.startsWith("http") ? first : `${site.url}/products/${first}.webp`;
  };

  const body =
    spec.id === "meta"
      ? metaFeed(ready, imageUrl)
      : spec.id === "ebay"
        ? ebayFeed(ready, imageUrl)
        : amazonFeed(ready, imageUrl);

  return new Response(body, {
    headers: {
      "Content-Type": spec.type,
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
