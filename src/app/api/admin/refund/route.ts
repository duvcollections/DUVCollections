import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AccessError } from "@/lib/access";
import { getOrder } from "@/lib/orders-admin";
import { stripeClient, secret } from "@/lib/stripe";
import { restoreStockForOrder } from "@/lib/products-repo";
import { sendRefundEmail } from "@/lib/email";

/**
 * Refund an order, whole or in part.
 *
 * Money leaves the business here, so the guards matter more than the
 * convenience. Stripe is the source of truth for what has already been
 * refunded — we ask it rather than tracking a total ourselves, because a
 * second copy of a number like that is a second chance to get it wrong.
 */

const REASONS = ["requested_by_customer", "duplicate", "fraudulent"] as const;

export async function POST(req: NextRequest) {
  let actor: string;
  try {
    actor = (await requireAdmin()).email;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof AccessError ? err.message : "Not authorised." },
      { status: 403 },
    );
  }

  let body: { id?: string; amount?: number; reason?: string; restock?: boolean; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { id } = body;
  if (!id) return NextResponse.json({ error: "Which order?" }, { status: 400 });

  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (!order.paymentIntentId) {
    return NextResponse.json({ error: "That order has no payment to refund." }, { status: 400 });
  }

  const stripe = stripeClient(await secret("STRIPE_SECRET_KEY"));

  // Ask Stripe what is already refunded rather than trusting our own view.
  let alreadyRefunded = 0;
  try {
    const pi = await stripe.paymentIntents.retrieve(order.paymentIntentId, { expand: ["latest_charge"] });
    const charge = pi.latest_charge;
    if (charge && typeof charge !== "string") alreadyRefunded = charge.amount_refunded ?? 0;
  } catch (err) {
    console.error("[refund] couldn't read payment intent:", err);
    return NextResponse.json({ error: "Couldn't reach Stripe to check this order." }, { status: 502 });
  }

  const totalCents = Math.round(order.total * 100);
  const remaining = totalCents - alreadyRefunded;
  if (remaining <= 0) {
    return NextResponse.json({ error: `${order.ref} is already fully refunded.` }, { status: 409 });
  }

  // Absent amount means the rest of it; anything else must fit inside it.
  const cents = body.amount === undefined ? remaining : Math.round(Number(body.amount) * 100);
  if (!Number.isFinite(cents) || cents <= 0) {
    return NextResponse.json({ error: "Enter an amount above zero." }, { status: 400 });
  }
  if (cents > remaining) {
    return NextResponse.json(
      { error: `That's more than is left. At most $${(remaining / 100).toFixed(2)} can still be refunded.` },
      { status: 400 },
    );
  }

  const reason = REASONS.includes(body.reason as (typeof REASONS)[number])
    ? (body.reason as (typeof REASONS)[number])
    : "requested_by_customer";

  let refundId: string;
  try {
    const refund = await stripe.refunds.create({
      payment_intent: order.paymentIntentId,
      amount: cents,
      reason,
      metadata: { order_ref: order.ref, actor, note: (body.note ?? "").slice(0, 400) },
    });
    refundId = refund.id;
  } catch (err) {
    const message = (err as Error).message || "Stripe refused the refund.";
    console.error(`[refund] ${order.ref} failed: ${message}`);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const full = cents === remaining && alreadyRefunded === 0;
  console.log(`[refund] ${actor} refunded $${(cents / 100).toFixed(2)} on ${order.ref} (${refundId})`);

  // Stamp the session so the order stops looking like it needs packing.
  //
  // Status is derived from the session, and a refunded session still reports
  // payment_status "paid" — so without this the order sits in the queue and
  // keeps counting toward revenue. Metadata updates merge, so this touches only
  // these two keys. Best-effort: the money has already moved, and a failure
  // here must not report the refund as failed.
  const refundedTotal = alreadyRefunded + cents;
  try {
    await stripe.checkout.sessions.update(order.id, {
      metadata: {
        refunded_amount: String(refundedTotal),
        refunded: refundedTotal >= totalCents ? "full" : "partial",
      },
    });
  } catch (err) {
    console.error(`[refund] could not stamp ${order.ref}: ${(err as Error).message}`);
  }

  // Stock and email are both best-effort. The money has moved; neither of
  // these failing should make it look like it hasn't.
  let restocked: string | null = null;
  if (body.restock && order.skus.length > 0) {
    try {
      const moves = await restoreStockForOrder(order.id, order.skus, actor);
      restocked = moves.length ? moves.map((m) => `${m.sku} +${m.qty}`).join(", ") : "nothing to restore";
    } catch (err) {
      restocked = `failed: ${(err as Error).message}`;
    }
  }

  let emailed = false;
  let emailError: string | null = null;
  if (order.email) {
    const sent = await sendRefundEmail({
      to: order.email,
      name: order.name,
      orderRef: order.ref,
      amount: cents / 100,
      full,
      note: body.note?.trim() || null,
    });
    emailed = sent.ok;
    if (!sent.ok) emailError = sent.error;
  }

  return NextResponse.json({
    ok: true,
    refunded: cents / 100,
    remaining: (remaining - cents) / 100,
    full,
    restocked,
    emailed,
    emailError,
  });
}
