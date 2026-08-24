/**
 * Where a product's photographs come from.
 *
 * Two sources, in priority order:
 *
 *   1. `products.images` in D1 — URLs added through the admin, either pasted
 *      or uploaded. This is the live path and needs no rebuild.
 *   2. `src/data/product-images.json` — the bundled ingest pipeline, kept so
 *      anything already processed by `npm run images:ingest` keeps working.
 *
 * Falling back to an illustration when both are empty is deliberate and stated
 * in ProductImage: a stock photo standing in for a real product is how a shop
 * earns "item not as described" claims.
 */

/** Hosts we will render a remote image from. */
const ALLOWED_HOSTS = [
  // Our own R2 bucket, once one exists.
  "duvcollections.com",
  "cdn.duvcollections.com",
  // eBay's image CDN — where this shop's existing photography already lives.
  "i.ebayimg.com",
  "ir.ebaystatic.com",
];

export type ImageCheck = { ok: true; url: string } | { ok: false; error: string };

/**
 * Validate a pasted image URL.
 *
 * Strict on purpose. An admin field that accepts any string is a field that
 * eventually holds `javascript:` or a tracking pixel pointed at a competitor's
 * server, and the storefront renders whatever it is given. Only https, only
 * hosts we recognise, only image-shaped paths.
 */
export function checkImageUrl(raw: string): ImageCheck {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "Empty URL." };
  if (trimmed.length > 500) return { ok: false, error: "That URL is implausibly long." };

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: "That isn't a valid URL." };
  }

  if (url.protocol !== "https:") {
    return { ok: false, error: "Image URLs must be https." };
  }

  const host = url.hostname.toLowerCase();
  const allowed = ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  if (!allowed) {
    return {
      ok: false,
      error:
        `Images can only come from ${ALLOWED_HOSTS.join(", ")}. ` +
        `Upload the file instead, or add ${host} to the allowlist if you trust it.`,
    };
  }

  // eBay serves extensionless URLs, so a missing extension is not fatal — but
  // an obviously wrong one is.
  const path = url.pathname.toLowerCase();
  const badExt = /\.(js|json|html?|php|svg|xml)$/.test(path);
  if (badExt) return { ok: false, error: "That doesn't look like an image file." };

  return { ok: true, url: trimmed };
}

/** Parse the JSON column, tolerating anything malformed rather than throwing. */
export function parseImages(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Cap on images per product — enough for a listing, short of an album. */
export const MAX_IMAGES = 8;
