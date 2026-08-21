import { stripeClient, secret } from "@/lib/stripe";
import type Stripe from "stripe";

/**
 * Orders, read straight from Stripe.
 *
 * Stripe already stores every order, address, amount and tax line, so there is
 * no second copy to keep in sync and nothing extra to secure. Fulfilment state
 * (shipped, carrier, tracking) is written back to the session's metadata, which
 * keeps the whole order in one place.
 */

export type OrderStatus = "paid" | "shipped" | "refunded" | "unpaid";

export type Order = {
  id: string;
  ref: string;
  created: number;
  status: OrderStatus;
  email: string | null;
  name: string | null;
  phone: string | null;
  address: Stripe.Address | null;
  currency: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  items: { title: string; qty: number; amount: number }[];
  carrier: string | null;
  tracking: string | null;
  shippedAt: string | null;
  /** The label PDF, if one was bought through Shippo. Reprintable any time. */
  labelUrl: string | null;
  paymentIntentId: string | null;
  /** `SKU x qty` pairs recorded at checkout, used to work out parcel weight. */
  skus: { sku: string; qty: number }[];
  /** Dollars refunded so far. Zero for untouched orders. */
  refundedAmount: number;
};

const cents = (n: number | null | undefined) => (n ?? 0) / 100;

function toOrder(s: Stripe.Checkout.Session): Order {
  const m = s.metadata ?? {};
  const shipped = Boolean(m.tracking);

  // A refunded Checkout Session still reports payment_status "paid" — because
  // it WAS paid; the refund is a separate object on the PaymentIntent. Without
  // accounting for it, a refunded order sits in the packing queue forever and
  // keeps counting toward revenue.
  //
  // Read from the expanded charge FIRST, and treat the metadata stamp only as a
  // fallback. An earlier version relied on the stamp alone, which meant any
  // refund issued before that code shipped — or through any tool that doesn't
  // write it — stayed invisible. Stripe already knows the answer; asking it is
  // both simpler and retroactive.
  const charge =
    typeof s.payment_intent === "object" && s.payment_intent
      ? typeof s.payment_intent.latest_charge === "object"
        ? s.payment_intent.latest_charge
        : null
      : null;

  const refundedCents = charge
    ? charge.amount_refunded
    : Number(m.refunded_amount ?? 0);

  const refundedAmount = refundedCents;
  const fullyRefunded =
    refundedCents > 0
      ? refundedCents >= (charge?.amount ?? s.amount_total ?? 0)
      : m.refunded === "full";

  return {
    id: s.id,
    ref: s.id.slice(-12).toUpperCase(),
    created: s.created,
    status:
      s.payment_status !== "paid"
        ? "unpaid"
        : fullyRefunded
          ? "refunded"
          : shipped
            ? "shipped"
            : "paid",
    email: s.customer_details?.email ?? null,
    name: s.customer_details?.name ?? null,
    phone: s.customer_details?.phone ?? null,
    address: s.collected_information?.shipping_details?.address
      ?? s.customer_details?.address
      ?? null,
    currency: (s.currency ?? "usd").toUpperCase(),
    subtotal: cents(s.amount_subtotal),
    shipping: cents(s.total_details?.amount_shipping),
    tax: cents(s.total_details?.amount_tax),
    total: cents(s.amount_total),
    items:
      s.line_items?.data.map((li) => ({
        title: li.description ?? "Item",
        qty: li.quantity ?? 1,
        amount: cents(li.amount_total),
      })) ?? [],
    carrier: m.carrier ?? null,
    tracking: m.tracking ?? null,
    shippedAt: m.shipped_at ?? null,
    labelUrl: m.label_url ?? null,
    paymentIntentId:
      typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id ?? null,
    skus: parseSkus(m.skus),
    refundedAmount: refundedAmount / 100,
  };
}

/** `DTF-ROLL-30-100x1,CH004x2` → structured lines. Never throws on junk. */
function parseSkus(raw: string | undefined): { sku: string; qty: number }[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => {
      const at = part.lastIndexOf("x");
      if (at < 1) return null;
      const qty = Number(part.slice(at + 1));
      if (!Number.isFinite(qty) || qty < 1) return null;
      return { sku: part.slice(0, at), qty: Math.floor(qty) };
    })
    .filter((l): l is { sku: string; qty: number } => l !== null);
}

export async function listOrders(limit = 50): Promise<Order[]> {
  const stripe = stripeClient(await secret("STRIPE_SECRET_KEY"));
  const res = await stripe.checkout.sessions.list({
    limit,
    // The charge carries amount_refunded, which is how a refund is detected.
    expand: ["data.line_items", "data.payment_intent.latest_charge"],
  });
  return res.data
    .filter((s) => s.payment_status === "paid")
    .map(toOrder)
    .sort((a, b) => b.created - a.created);
}

export async function getOrder(id: string): Promise<Order | null> {
  const stripe = stripeClient(await secret("STRIPE_SECRET_KEY"));
  try {
    const s = await stripe.checkout.sessions.retrieve(id, {
      expand: ["line_items", "payment_intent.latest_charge"],
    });
    return toOrder(s);
  } catch {
    return null;
  }
}

/**
 * Find an order from what a customer actually has to hand: the reference on
 * their confirmation page and the email they checked out with.
 *
 * Both must match. The reference alone isn't enough — that would let anyone who
 * guessed a reference read someone else's address.
 */
export async function findOrderForCustomer(
  ref: string,
  email: string,
): Promise<Order | null> {
  const stripe = stripeClient(await secret("STRIPE_SECRET_KEY"));
  const wanted = ref.trim().toUpperCase();
  const wantedEmail = email.trim().toLowerCase();
  if (wanted.length < 8 || !wantedEmail.includes("@")) return null;

  // Sessions aren't queryable by our short reference, so scan recent ones.
  let startingAfter: string | undefined;
  for (let page = 0; page < 6; page++) {
    const res: Stripe.ApiList<Stripe.Checkout.Session> =
      await stripe.checkout.sessions.list({
        limit: 100,
        expand: ["data.line_items", "data.payment_intent.latest_charge"],
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });

    for (const s of res.data) {
      if (s.payment_status !== "paid") continue;
      if (s.id.slice(-12).toUpperCase() !== wanted) continue;
      if ((s.customer_details?.email ?? "").toLowerCase() !== wantedEmail) continue;
      return toOrder(s);
    }

    if (!res.has_more || res.data.length === 0) break;
    startingAfter = res.data[res.data.length - 1].id;
  }
  return null;
}

export async function markShipped(
  id: string,
  carrier: string,
  tracking: string,
  labelUrl?: string | null,
): Promise<Order> {
  const stripe = stripeClient(await secret("STRIPE_SECRET_KEY"));
  const s = await stripe.checkout.sessions.update(id, {
    metadata: {
      carrier: carrier.trim(),
      tracking: tracking.trim(),
      shipped_at: new Date().toISOString(),
      // Persisted deliberately. Without this the label PDF exists only in the
      // response that bought it — close the tab and the only way back to a
      // label you have already paid for is the Shippo dashboard. Stripe
      // metadata values cap at 500 characters; Shippo's URLs are far shorter,
      // but truncating silently would store a broken link, so an over-long one
      // is dropped instead and the Shippo fallback in the UI takes over.
      ...(labelUrl && labelUrl.length <= 480 ? { label_url: labelUrl } : {}),
    },
  });
  const full = await stripe.checkout.sessions.retrieve(s.id, {
    expand: ["line_items", "payment_intent.latest_charge"],
  });
  return toOrder(full);
}

/**
 * Current time in Unix seconds — the unit Stripe uses for `created`.
 * Wrapped so the "now" reads sit outside component bodies; these pages are
 * `force-dynamic` server components, so this is evaluated once per request.
 */
export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * The subset of an order a customer may see.
 *
 * Deliberately narrower than the admin view: no phone number, no street
 * address, no Stripe ids. City and state only — things the buyer typed in
 * themselves — so a forwarded confirmation email discloses nothing new.
 */
export type CustomerOrderView = {
  ref: string;
  placed: number;
  status: OrderStatus;
  items: { title: string; qty: number }[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  carrier: string | null;
  tracking: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  city: string | null;
  state: string | null;
};

export function toCustomerView(
  o: Order,
  trackingUrlFor: (carrier: string, tracking: string) => string | null,
): CustomerOrderView {
  return {
    ref: o.ref,
    placed: o.created,
    status: o.status,
    items: o.items.map((i) => ({ title: i.title, qty: i.qty })),
    subtotal: o.subtotal,
    shipping: o.shipping,
    tax: o.tax,
    total: o.total,
    carrier: o.carrier,
    tracking: o.tracking,
    trackingUrl: o.carrier && o.tracking ? trackingUrlFor(o.carrier, o.tracking) : null,
    shippedAt: o.shippedAt,
    city: o.address?.city ?? null,
    state: o.address?.state ?? null,
  };
}
