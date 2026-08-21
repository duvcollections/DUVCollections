import type { Product } from "@/lib/catalog";
import { availability } from "@/lib/catalog";
import { site } from "@/lib/site";

/**
 * Google Merchant Center product feed (RSS 2.0 + the `g:` namespace).
 *
 * This is what puts products into the free Shopping listings. Google is strict
 * about it in ways worth knowing:
 *
 * - `g:id` must be stable forever. Reusing an id for a different product merges
 *   their performance history and is very hard to unpick, so we use the SKU.
 * - `g:image_link` is REQUIRED. Items without one are rejected, which is why
 *   `productsForFeed` filters them out rather than submitting a known-bad row —
 *   a feed full of errors gets the whole account flagged.
 * - `g:availability` must match the landing page. Saying "in stock" for
 *   something out of stock is a policy violation, not a cosmetic slip.
 */

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // Strip control characters — a stray one invalidates the whole XML document
    // and Google rejects the feed rather than the offending row.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

/** Google's condition vocabulary is a closed set. */
const condition = (c: string | undefined) =>
  c === "used" || c === "refurbished" ? c : "new";

export type FeedItem = { product: Product; imageUrl: string };

/**
 * Only products Google will actually accept.
 *
 * Archived, out-of-stock and image-less products are all excluded. The last of
 * those is the big one right now: with no photography, this feed is legitimately
 * empty — and an empty feed is the honest answer, not a bug to work around.
 */
export function productsForFeed(
  products: Product[],
  photosFor: (sku: string) => string[],
): FeedItem[] {
  const items: FeedItem[] = [];
  for (const p of products) {
    if (p.archived) continue;
    if (availability(p) === "out-of-stock") continue;
    const photos = photosFor(p.sku);
    if (photos.length === 0) continue;
    items.push({ product: p, imageUrl: `${site.url}/products/${photos[0]}.webp` });
  }
  return items;
}

export function buildFeed(items: FeedItem[]): string {
  const rows = items
    .map(({ product: p, imageUrl }) => {
      const avail = availability(p) === "out-of-stock" ? "out_of_stock" : "in_stock";
      const shipping =
        p.price >= site.policy.freeShippingThreshold ? 0 : site.policy.shippingFlatRate;

      // A product with no UPC must say so explicitly, or Google holds the item
      // waiting for an identifier it is never going to receive.
      const identifier = p.upc
        ? `      <g:gtin>${esc(p.upc)}</g:gtin>`
        : `      <g:identifier_exists>no</g:identifier_exists>`;

      return `    <item>
      <g:id>${esc(p.sku)}</g:id>
      <title>${esc(p.title)}</title>
      <link>${site.url}/product/${esc(p.slug)}</link>
      <description>${esc(p.metaDescription || p.description)}</description>
      <g:image_link>${esc(imageUrl)}</g:image_link>
      <g:availability>${avail}</g:availability>
      <g:price>${p.price.toFixed(2)} USD</g:price>
      <g:condition>${condition(p.condition)}</g:condition>
      <g:brand>${esc(site.name)}</g:brand>
      <g:mpn>${esc(p.mpn ?? p.sku)}</g:mpn>
${identifier}
      <g:shipping>
        <g:country>US</g:country>
        <g:service>Standard</g:service>
        <g:price>${shipping.toFixed(2)} USD</g:price>
      </g:shipping>
      <g:shipping_weight>${p.shipWeightOz ?? 4} oz</g:shipping_weight>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${esc(site.name)}</title>
    <link>${site.url}</link>
    <description>${esc(site.tagline)}</description>
${rows}
  </channel>
</rss>
`;
}
