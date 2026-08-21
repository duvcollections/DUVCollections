import { secret } from "@/lib/stripe";

/**
 * Reads listings from our own eBay store.
 *
 * Uses the **Browse API** rather than the Sell/Inventory API, and the choice
 * matters. The Inventory API only sees listings that have been migrated into
 * eBay's newer inventory model, and migration demands seller-defined SKUs,
 * configured business policies, and Good-Til-Cancelled fixed-price format on
 * every listing. Browse needs none of that: it reads the public catalogue with
 * an application token, so a store that has been running for years on legacy
 * listings is readable today rather than after a migration project.
 *
 * The trade-off is honest and worth stating: Browse returns what a *shopper*
 * can see. Ended listings, private ones, and internal SKU fields are not
 * included, and quantity is only sometimes exposed. This is an import aid, not
 * a two-way sync.
 */

const OAUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const BROWSE_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search";

/** eBay caps a single search page at 200 and the whole result set at 10,000. */
const PAGE_SIZE = 200;
const MAX_PAGES = 10;

export class EbayNotConfigured extends Error {
  constructor() {
    super(
      "eBay isn't configured. Add EBAY_CLIENT_ID and EBAY_CLIENT_SECRET as " +
        "secrets, from an eBay developer application.",
    );
  }
}

export type EbayListing = {
  itemId: string;
  title: string;
  price: number | null;
  currency: string;
  /** Full-size image URLs, best first. Empty when eBay returned none. */
  images: string[];
  condition: string | null;
  /** eBay's leaf category name, useful for guessing our own category. */
  categoryPath: string | null;
  itemWebUrl: string;
  /** Only present on some listings — Browse does not always expose it. */
  availableQuantity: number | null;
};

/**
 * Application access token via client-credentials.
 *
 * No user consent, no refresh token, no redirect flow: this reads public data,
 * so it needs only the app's own identity. Tokens last two hours; we do not
 * cache across requests because a Worker instance is short-lived anyway and a
 * stale token in a module global is a subtle source of 401s.
 */
async function appToken(): Promise<string> {
  let id: string;
  let clientSecret: string;
  try {
    id = await secret("EBAY_CLIENT_ID");
    clientSecret = await secret("EBAY_CLIENT_SECRET");
  } catch {
    throw new EbayNotConfigured();
  }
  if (!id || !clientSecret) throw new EbayNotConfigured();

  const basic = btoa(`${id}:${clientSecret}`);
  const res = await fetch(OAUTH_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `eBay refused the credentials (${res.status}). ${detail.slice(0, 200)}`,
    );
  }

  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) throw new Error("eBay returned no access token.");
  return body.access_token;
}

type BrowseImage = { imageUrl?: string };
type BrowseItem = {
  itemId?: string;
  title?: string;
  price?: { value?: string; currency?: string };
  image?: BrowseImage;
  additionalImages?: BrowseImage[];
  condition?: string;
  categoryPath?: string;
  itemWebUrl?: string;
  estimatedAvailabilities?: { estimatedAvailableQuantity?: number }[];
};

/** eBay serves thumbnails; this asks for the largest standard size instead. */
const fullSize = (url: string) => url.replace(/\/s-l\d+\./, "/s-l1600.");

function toListing(raw: BrowseItem): EbayListing | null {
  if (!raw.itemId || !raw.title) return null;

  const images: string[] = [];
  if (raw.image?.imageUrl) images.push(fullSize(raw.image.imageUrl));
  for (const extra of raw.additionalImages ?? []) {
    if (extra.imageUrl) images.push(fullSize(extra.imageUrl));
  }

  const priceRaw = raw.price?.value;
  const price = priceRaw !== undefined ? Number(priceRaw) : NaN;

  return {
    itemId: raw.itemId,
    title: raw.title.trim(),
    price: Number.isFinite(price) ? price : null,
    currency: raw.price?.currency ?? "USD",
    images,
    condition: raw.condition ?? null,
    categoryPath: raw.categoryPath ?? null,
    itemWebUrl: raw.itemWebUrl ?? "",
    availableQuantity:
      raw.estimatedAvailabilities?.[0]?.estimatedAvailableQuantity ?? null,
  };
}

/**
 * Every active listing for a seller.
 *
 * Pages until eBay stops returning results or the page cap is reached. The cap
 * exists so a mistyped seller name can't spend an afternoon walking someone
 * else's ten-thousand-item store.
 */
export async function fetchSellerListings(
  sellerUsername: string,
  marketplace = "EBAY_US",
): Promise<{ listings: EbayListing[]; truncated: boolean }> {
  const token = await appToken();
  const listings: EbayListing[] = [];
  let truncated = false;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(BROWSE_URL);
    // A seller filter needs some query or category to anchor the search;
    // an empty `q` with only a filter is rejected, so we search the whole
    // catalogue and narrow entirely by seller.
    url.searchParams.set("filter", `sellers:{${sellerUsername}}`);
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set("offset", String(page * PAGE_SIZE));

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": marketplace,
      },
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`eBay search failed (${res.status}). ${detail.slice(0, 240)}`);
    }

    const body = (await res.json()) as {
      itemSummaries?: BrowseItem[];
      total?: number;
    };

    const batch = (body.itemSummaries ?? [])
      .map(toListing)
      .filter((l): l is EbayListing => l !== null);

    listings.push(...batch);

    if (batch.length < PAGE_SIZE) break;
    if (page === MAX_PAGES - 1 && (body.total ?? 0) > listings.length) {
      truncated = true;
    }
  }

  return { listings, truncated };
}

/* ------------------------------------------------------------- matching */

export type ImportPlan = {
  /** eBay listings that look like a product we already stock. */
  matched: { listing: EbayListing; sku: string; reasons: string[] }[];
  /** Listings with no obvious counterpart here. */
  unmatched: EbayListing[];
};

const normalise = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * Pair eBay listings with SKUs we already have.
 *
 * Deliberately conservative. A wrong match writes an eBay photo onto the wrong
 * product, which is worse than no match at all — so a listing only pairs when
 * the SKU appears in the title, or when the titles overlap strongly AND the
 * prices agree. Everything else is reported as unmatched for a human to judge.
 */
export function planImport(
  listings: EbayListing[],
  products: { sku: string; title: string; price: number }[],
): ImportPlan {
  const matched: ImportPlan["matched"] = [];
  const unmatched: EbayListing[] = [];
  const claimed = new Set<string>();

  for (const listing of listings) {
    const listingWords = new Set(normalise(listing.title).split(" "));
    let best: { sku: string; reasons: string[]; score: number } | null = null;

    for (const p of products) {
      if (claimed.has(p.sku)) continue;
      const reasons: string[] = [];
      let score = 0;

      // Strongest signal: our SKU printed in the eBay title.
      if (normalise(listing.title).includes(normalise(p.sku))) {
        reasons.push(`SKU ${p.sku} appears in the eBay title`);
        score += 100;
      }

      const productWords = normalise(p.title).split(" ").filter((w) => w.length > 2);
      const overlap = productWords.filter((w) => listingWords.has(w)).length;
      const ratio = productWords.length ? overlap / productWords.length : 0;
      if (ratio >= 0.6) {
        reasons.push(`${Math.round(ratio * 100)}% of the title words match`);
        score += ratio * 50;
      }

      if (listing.price !== null && Math.abs(listing.price - p.price) < 0.01) {
        reasons.push(`price matches exactly ($${p.price.toFixed(2)})`);
        score += 25;
      }

      // A wildly different price means a different product — usually another
      // pack size sharing every word of the title. This must VETO a title-only
      // match rather than merely dock it: a 500 g powder at $150 shares all
      // its words with the $15 one, and a numeric penalty was not enough to
      // stop it matching.
      const priceFarOff =
        listing.price !== null &&
        p.price > 0 &&
        Math.abs(listing.price - p.price) / p.price > 0.5;

      // The one exception is an explicit SKU in the title. If eBay says it is
      // PND003 then it is PND003, whatever the price — that is a pricing
      // question for a human, not a matching one.
      const skuStated = score >= 100;
      if (priceFarOff && !skuStated) continue;

      if (score > (best?.score ?? 0)) best = { sku: p.sku, reasons, score };
    }

    // 100 = an explicit SKU match; 55 = strong title overlap plus exact price.
    if (best && best.score >= 55) {
      claimed.add(best.sku);
      matched.push({ listing, sku: best.sku, reasons: best.reasons });
    } else {
      unmatched.push(listing);
    }
  }

  return { matched, unmatched };
}
