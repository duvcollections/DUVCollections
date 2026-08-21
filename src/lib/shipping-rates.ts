import { site } from "@/lib/site";

/**
 * The only product fields shipping needs.
 *
 * Deliberately narrow: the cart in the browser holds a trimmed catalogue, and
 * demanding a full `Product` here forced an `as never` cast at that call site —
 * which silently hid the fact that the weight was not being sent to the client
 * at all. Every parcel quoted as 4 oz. A narrow type makes that a compile error.
 */
export type ShippableProduct = { sku: string; shipWeightOz?: number };

/**
 * What we charge the customer to ship.
 *
 * The old rule was a flat $5.99 with free shipping over $75. That quietly lost
 * money on every heavy order: a 6 lb roll of DTF film costs about $12.60 to
 * post and shipped free, and eight of the fifty-three SKUs were underwater.
 *
 * The fix is to price by weight, which is what carriers actually charge on.
 * Rates here are *bands*, not live carrier quotes:
 *
 *   - Stripe Checkout's address-based dynamic rates are still a preview
 *     feature, and a live shop should not depend on one.
 *   - A live quote per checkout means a Shippo call on the critical path. If
 *     Shippo is slow or down, the customer cannot pay.
 *   - Bands are predictable. The customer sees the same price for the same
 *     basket, which is easier to explain and to refund against.
 *
 * The bands are set ABOVE our estimated cost at every tier, so the shop makes a
 * small margin on light parcels and breaks even on heavy ones. Actual label
 * cost is still checked against this when you buy — see `rateHealth` below.
 */

/** Ounces in a pound, named because `/16` in three places is how bugs start. */
const OZ_PER_LB = 16;

export type RateBand = {
  /** Inclusive upper bound in ounces. Infinity for the top band. */
  maxOz: number;
  /** What we charge, in dollars. */
  price: number;
  label: string;
  /** Our estimated USPS Ground Advantage commercial cost at this weight. */
  estimatedCost: number;
};

/**
 * USPS Ground Advantage, commercial pricing, plus packaging and a small margin.
 *
 * These are deliberately conservative — it is better to slightly overcharge and
 * refund the difference than to eat the cost on every order. Review them when
 * USPS changes rates, which is usually every January.
 */
export const RATE_BANDS: RateBand[] = [
  { maxOz: 4, price: 4.99, label: "Standard shipping", estimatedCost: 4.2 },
  { maxOz: 8, price: 5.99, label: "Standard shipping", estimatedCost: 4.75 },
  { maxOz: 12, price: 6.99, label: "Standard shipping", estimatedCost: 5.4 },
  { maxOz: OZ_PER_LB, price: 7.99, label: "Standard shipping", estimatedCost: 6.1 },
  { maxOz: 2 * OZ_PER_LB, price: 9.99, label: "Standard shipping", estimatedCost: 7.6 },
  { maxOz: 3 * OZ_PER_LB, price: 11.99, label: "Standard shipping", estimatedCost: 8.9 },
  { maxOz: 5 * OZ_PER_LB, price: 14.99, label: "Standard shipping", estimatedCost: 11.4 },
  { maxOz: 7 * OZ_PER_LB, price: 17.99, label: "Standard shipping", estimatedCost: 12.6 },
  { maxOz: Infinity, price: 22.99, label: "Heavy parcel shipping", estimatedCost: 16.0 },
];

/** Packaging adds real weight: box, tape, filler, label. */
const PACKAGING_OZ = 3;

export type CartLine = { sku: string; qty: number };

/**
 * Total shipping weight for a basket, including packaging.
 *
 * An unknown SKU contributes the catalogue default rather than zero. Treating
 * it as weightless is how a basket of unknowns ships in the cheapest band and
 * costs three times what it charged.
 */
export function cartWeightOz(lines: CartLine[], products: ShippableProduct[]): number {
  let oz = 0;
  for (const l of lines) {
    const p = products.find((x) => x.sku === l.sku);
    oz += (p?.shipWeightOz ?? 4) * l.qty;
  }
  return oz > 0 ? oz + PACKAGING_OZ : 0;
}

export function bandFor(weightOz: number): RateBand {
  return RATE_BANDS.find((b) => weightOz <= b.maxOz) ?? RATE_BANDS[RATE_BANDS.length - 1];
}

export type ShippingQuote = {
  /** Cents, for Stripe. */
  amount: number;
  label: string;
  weightOz: number;
  free: boolean;
  /** Our estimated cost in dollars — for reporting, never shown to customers. */
  estimatedCost: number;
};

/**
 * Price the shipping on a basket.
 *
 * Free shipping still exists, but it is no longer unconditional above a spend
 * threshold: it applies only when the parcel is light enough that giving it
 * away doesn't cost more than the margin on the order. A $80 six-pound roll no
 * longer ships free, which is the single biggest leak this fixes.
 */
export function quoteShipping(
  lines: CartLine[],
  products: ShippableProduct[],
  subtotalDollars: number,
): ShippingQuote {
  const weightOz = cartWeightOz(lines, products);
  const band = bandFor(weightOz);

  const qualifiesOnValue = subtotalDollars >= site.policy.freeShippingThreshold;
  const lightEnoughToGiveAway = weightOz <= site.policy.freeShippingMaxOz;
  const free = qualifiesOnValue && lightEnoughToGiveAway;

  return {
    amount: free ? 0 : Math.round(band.price * 100),
    label: free
      ? `Free shipping (orders over $${site.policy.freeShippingThreshold})`
      : band.label,
    weightOz,
    free,
    estimatedCost: band.estimatedCost,
  };
}

/**
 * Did this order actually make or lose money on shipping?
 *
 * Called after a label is bought, with the real cost from Shippo, so the
 * dashboard can show where the bands are wrong instead of leaving it to be
 * discovered in an accountant's spreadsheet months later.
 */
export function rateHealth(chargedDollars: number, actualLabelDollars: number) {
  const margin = chargedDollars - actualLabelDollars;
  return {
    margin,
    losing: margin < 0,
    // Under a dollar either way is noise, not a pricing problem.
    significant: Math.abs(margin) >= 1,
  };
}

/** Human summary of a weight, for the admin. */
export const describeWeight = (oz: number): string =>
  oz < OZ_PER_LB ? `${Math.round(oz)} oz` : `${(oz / OZ_PER_LB).toFixed(1)} lb`;
