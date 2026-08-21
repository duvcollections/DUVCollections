import Stripe from "stripe";

/**
 * Discount codes, on top of Stripe's own coupon engine.
 *
 * Two objects are involved and the distinction matters: a *coupon* is the rule
 * ("20% off"), a *promotion code* is the string a customer types ("SPRING20").
 * One coupon can carry several codes, which is how you run the same offer for
 * two audiences and still tell them apart in the numbers.
 *
 * We keep no local table. Stripe is the source of truth, redemption counts are
 * already tracked there, and a second copy here could only ever disagree with it.
 */

export type DiscountKind = "percent" | "amount";

export type NewDiscount = {
  code: string;
  kind: DiscountKind;
  /** Percent (1–100) or dollars, depending on `kind`. */
  value: number;
  /** Null means unlimited. */
  maxRedemptions: number | null;
  /** ISO date (YYYY-MM-DD) or null for no expiry. */
  expiresOn: string | null;
  /** Minimum order subtotal in dollars, or null. */
  minimumOrder: number | null;
  /** True = one redemption per customer. */
  oncePerCustomer: boolean;
};

export type DiscountRow = {
  id: string;
  code: string;
  label: string;
  active: boolean;
  timesRedeemed: number;
  maxRedemptions: number | null;
  expiresOn: string | null;
  minimumOrder: number | null;
  created: number;
};

/** Codes are matched case-insensitively by Stripe, but stored as typed. */
export const normaliseCode = (raw: string) =>
  raw.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");

export function validateDiscount(d: NewDiscount): string | null {
  if (normaliseCode(d.code).length < 3) {
    return "Code must be at least 3 characters (letters, numbers, - and _ only).";
  }
  if (normaliseCode(d.code).length > 40) return "Code is too long.";

  if (!Number.isFinite(d.value) || d.value <= 0) return "Value must be greater than zero.";
  if (d.kind === "percent" && d.value > 100) return "A percentage can't exceed 100.";
  if (d.kind === "percent" && !Number.isInteger(d.value * 100)) {
    return "Percentage is too precise — use at most two decimal places.";
  }
  if (d.kind === "amount" && d.value > 10000) return "That fixed amount looks like a typo.";

  if (d.maxRedemptions !== null) {
    if (!Number.isInteger(d.maxRedemptions) || d.maxRedemptions < 1) {
      return "Redemption limit must be a whole number of at least 1.";
    }
  }

  if (d.minimumOrder !== null && (!Number.isFinite(d.minimumOrder) || d.minimumOrder < 0)) {
    return "Minimum order must be zero or more.";
  }

  if (d.expiresOn !== null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.expiresOn)) return "Expiry date must be YYYY-MM-DD.";
    const at = Date.parse(`${d.expiresOn}T23:59:59Z`);
    if (!Number.isFinite(at)) return "That expiry date isn't a real date.";
    if (at < Date.now()) return "That expiry date is in the past.";
  }

  return null;
}

/** Human-readable summary of what a coupon does, for the admin list. */
export function describeCoupon(c: Stripe.Coupon): string {
  if (c.percent_off) return `${c.percent_off}% off`;
  if (c.amount_off) return `$${(c.amount_off / 100).toFixed(2)} off`;
  return "Discount";
}

export async function createDiscount(
  stripe: Stripe,
  d: NewDiscount,
): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  const problem = validateDiscount(d);
  if (problem) return { ok: false, error: problem };

  const code = normaliseCode(d.code);

  try {
    // Refuse a duplicate up front. Stripe would happily create a second code
    // with the same string on a different coupon, and then which rule applies
    // depends on internal ordering — that is not something to leave to chance.
    const existing = await stripe.promotionCodes.list({ code, limit: 1 });
    if (existing.data.length > 0) {
      return { ok: false, error: `${code} already exists. Deactivate it first, or pick another code.` };
    }

    const coupon = await stripe.coupons.create({
      duration: "once",
      name: code,
      ...(d.kind === "percent"
        ? { percent_off: d.value }
        : { amount_off: Math.round(d.value * 100), currency: "usd" }),
    });

    // Build restrictions once. Spreading two conditional `restrictions` keys
    // would mean the later one silently replaced the earlier — so a code with
    // both a minimum order and a first-time-only rule would quietly lose one.
    const restrictions: {
      first_time_transaction?: boolean;
      minimum_amount?: number;
      minimum_amount_currency?: string;
    } = {};
    if (d.oncePerCustomer) restrictions.first_time_transaction = true;
    if (d.minimumOrder !== null && d.minimumOrder > 0) {
      restrictions.minimum_amount = Math.round(d.minimumOrder * 100);
      restrictions.minimum_amount_currency = "usd";
    }

    await stripe.promotionCodes.create({
      promotion: { type: "coupon", coupon: coupon.id },
      code,
      ...(d.maxRedemptions !== null ? { max_redemptions: d.maxRedemptions } : {}),
      ...(d.expiresOn !== null
        ? { expires_at: Math.floor(Date.parse(`${d.expiresOn}T23:59:59Z`) / 1000) }
        : {}),
      ...(Object.keys(restrictions).length > 0 ? { restrictions } : {}),
    });

    return { ok: true, code };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function listDiscounts(stripe: Stripe, limit = 50): Promise<DiscountRow[]> {
  const codes = await stripe.promotionCodes.list({ limit, expand: ["data.promotion.coupon"] });

  return codes.data.map((pc) => {
    // Expanded above, but if Stripe ever hands back a bare id we degrade to a
    // generic label rather than throwing and taking the whole page down.
    const raw = pc.promotion?.coupon;
    const coupon = raw && typeof raw !== "string" ? raw : null;
    const min = pc.restrictions?.minimum_amount ?? null;
    return {
      id: pc.id,
      code: pc.code,
      label: coupon ? describeCoupon(coupon) : "Discount",
      active: pc.active,
      timesRedeemed: pc.times_redeemed,
      maxRedemptions: pc.max_redemptions ?? null,
      expiresOn: pc.expires_at ? new Date(pc.expires_at * 1000).toISOString().slice(0, 10) : null,
      minimumOrder: min === null ? null : min / 100,
      created: pc.created * 1000,
    };
  });
}

/**
 * Codes are deactivated, never deleted.
 *
 * An order placed last week references the promotion code that paid for it.
 * Deleting the code would leave that order pointing at nothing, and the refund
 * maths would no longer reconcile.
 */
export async function setDiscountActive(
  stripe: Stripe,
  id: string,
  active: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await stripe.promotionCodes.update(id, { active });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
