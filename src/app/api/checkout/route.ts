import { NextRequest, NextResponse } from "next/server";
import { stripeClient, secret } from "@/lib/stripe";
import { priceCart } from "@/lib/orders";
import { site, money } from "@/lib/site";


/**
 * Creates a Stripe Checkout Session and returns its URL.
 *
 * Nothing sensitive crosses the wire to the browser: the response is a redirect
 * URL to Stripe's own hosted page, so card details never touch this server and
 * the site stays in the simplest PCI scope there is.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const cart = (body as { lines?: unknown })?.lines;
  const priced = await priceCart(cart);
  if ("error" in priced) {
    return NextResponse.json({ error: priced.error }, { status: 400 });
  }

  let stripe;
  try {
    stripe = stripeClient(await secret("STRIPE_SECRET_KEY"));
  } catch (err) {
    console.error("Stripe not configured:", (err as Error).message);
    return NextResponse.json(
      { error: "Payments aren't switched on yet. Please email us and we'll invoice you." },
      { status: 503 },
    );
  }

  const origin = req.headers.get("origin") ?? site.url;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Guest checkout: an email is all we ask for.
      customer_creation: "if_required",
      line_items: priced.lines.map((l) => ({
        quantity: l.qty,
        price_data: {
          currency: "usd",
          unit_amount: l.unitAmount,
          product_data: { name: l.title, metadata: { sku: l.sku } },
        },
      })),

      // Sales tax by delivery address. Rates differ by state, county and city,
      // which is why it can't be shown before an address is entered.
      automatic_tax: { enabled: true },

      shipping_address_collection: { allowed_countries: ["US"] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: priced.freeShipping
              ? `Free shipping (orders over ${money(site.policy.freeShippingThreshold)})`
              : "Standard US shipping",
            fixed_amount: { amount: priced.shipping, currency: "usd" },
            delivery_estimate: {
              minimum: { unit: "business_day", value: 3 },
              maximum: { unit: "business_day", value: 7 },
            },
          },
        },
      ],

      phone_number_collection: { enabled: true },
      billing_address_collection: "auto",
      allow_promotion_codes: true,

      success_url: `${origin}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart?cancelled=1`,

      metadata: {
        skus: priced.lines.map((l) => `${l.sku}x${l.qty}`).join(","),
      },
    });

    if (!session.url) throw new Error("Stripe returned no checkout URL");
    return NextResponse.json({ url: session.url });
  } catch (err) {
    // Never echo the raw Stripe error to the browser — it can leak account detail.
    console.error("Checkout session failed:", err);
    return NextResponse.json(
      { error: "We couldn't start checkout. Please try again, or email us." },
      { status: 502 },
    );
  }
}
