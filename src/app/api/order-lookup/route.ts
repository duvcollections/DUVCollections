import { NextRequest, NextResponse } from "next/server";
import { findOrderForCustomer } from "@/lib/orders-admin";
import { trackingUrl } from "@/lib/email";

/**
 * Guest order lookup.
 *
 * Requires BOTH the order reference and the email it was placed with. The
 * reference alone would let anyone who guessed one read a stranger's name,
 * address and phone number.
 *
 * The response is deliberately identical whether the reference is wrong, the
 * email is wrong, or the order doesn't exist — so this can't be used to work
 * out which references are real.
 */
export async function POST(req: NextRequest) {
  let body: { ref?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const ref = String(body.ref ?? "").trim();
  const email = String(body.email ?? "").trim();

  if (!ref || !email) {
    return NextResponse.json(
      { error: "Enter both your order reference and the email you used." },
      { status: 400 },
    );
  }

  const notFound = NextResponse.json({
    found: false,
    message:
      "We couldn't find an order with that reference and email. Check both against your " +
      "confirmation email — the reference is the 12 characters shown on the order page.",
  });

  let order;
  try {
    order = await findOrderForCustomer(ref, email);
  } catch (err) {
    console.error("[lookup] failed:", err);
    return NextResponse.json(
      { error: "We couldn't check that right now. Please try again shortly." },
      { status: 503 },
    );
  }

  if (!order) return notFound;

  // Only what the buyer already knows. No phone, no internal ids.
  return NextResponse.json({
    found: true,
    order: {
      ref: order.ref,
      placed: order.created,
      status: order.status,
      items: order.items.map((i) => ({ title: i.title, qty: i.qty })),
      subtotal: order.subtotal,
      shipping: order.shipping,
      tax: order.tax,
      total: order.total,
      carrier: order.carrier,
      tracking: order.tracking,
      trackingUrl:
        order.carrier && order.tracking ? trackingUrl(order.carrier, order.tracking) : null,
      shippedAt: order.shippedAt,
      city: order.address?.city ?? null,
      state: order.address?.state ?? null,
    },
  });
}
