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
  paymentIntentId: string | null;
};

const cents = (n: number | null | undefined) => (n ?? 0) / 100;

function toOrder(s: Stripe.Checkout.Session): Order {
  const m = s.metadata ?? {};
  const shipped = Boolean(m.tracking);
  return {
    id: s.id,
    ref: s.id.slice(-12).toUpperCase(),
    created: s.created,
    status:
      s.payment_status !== "paid" ? "unpaid" : shipped ? "shipped" : "paid",
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
    paymentIntentId:
      typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id ?? null,
  };
}

export async function listOrders(limit = 50): Promise<Order[]> {
  const stripe = stripeClient(await secret("STRIPE_SECRET_KEY"));
  const res = await stripe.checkout.sessions.list({
    limit,
    expand: ["data.line_items"],
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
      expand: ["line_items"],
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
        expand: ["data.line_items"],
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
): Promise<Order> {
  const stripe = stripeClient(await secret("STRIPE_SECRET_KEY"));
  const s = await stripe.checkout.sessions.update(id, {
    metadata: {
      carrier: carrier.trim(),
      tracking: tracking.trim(),
      shipped_at: new Date().toISOString(),
    },
  });
  const full = await stripe.checkout.sessions.retrieve(s.id, { expand: ["line_items"] });
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
