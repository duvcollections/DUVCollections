import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AccessError } from "@/lib/access";
import { getOrder, markShipped } from "@/lib/orders-admin";
import { buyLabel, ShippoError } from "@/lib/shippo";
import { sendShippedEmail, trackingUrl } from "@/lib/email";

/**
 * Buy one label.
 *
 * This is the only endpoint in the app that spends money, so the order of
 * operations matters. Shippo is charged first; only once a label actually
 * exists do we touch the order or email anyone. Doing it the other way round
 * would email a customer a tracking number for a label that was never bought.
 *
 * Everything after the purchase is best-effort and reported individually. If
 * the email fails, you still get the label — you do not get a failed request
 * that tempts you into buying a second one.
 */
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

  let body: { id?: string; rateId?: string; notify?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { id, rateId } = body;
  if (!id || !rateId) {
    return NextResponse.json({ error: "Order and rate are both required." }, { status: 400 });
  }

  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  // Refuse to buy a second label for an order that already has one. Without
  // this, a double-click costs real postage twice.
  if (order.tracking) {
    return NextResponse.json(
      { error: `${order.ref} already has tracking (${order.tracking}). Void that label in Shippo first if it's wrong.` },
      { status: 409 },
    );
  }

  let label;
  try {
    label = await buyLabel(rateId);
  } catch (err) {
    const message = err instanceof ShippoError ? err.message : "Couldn't buy that label.";
    console.error(`[shippo] buy for ${order.ref} failed: ${message}`);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const carrier = label.carrier || "USPS";
  console.log(`[shippo] ${actor} bought ${carrier} ${label.tracking} for ${order.ref} ($${label.amount})`);

  let saved = true;
  try {
    await markShipped(order.id, carrier, label.tracking);
  } catch (err) {
    // The label is bought and paid for. Say so loudly rather than pretending
    // the whole thing failed — the postage is spent either way.
    saved = false;
    console.error(`[shippo] label bought but order not updated for ${order.ref}:`, err);
  }

  let emailed = false;
  let emailError: string | null = null;
  if (body.notify !== false && order.email && saved) {
    const sent = await sendShippedEmail({
      to: order.email,
      name: order.name,
      orderRef: order.ref,
      sessionId: order.id,
      carrier,
      tracking: label.tracking,
      trackingUrl: label.trackingUrl ?? trackingUrl(carrier, label.tracking),
      items: order.items.map((i) => ({ title: i.title, qty: i.qty })),
      total: order.total,
      nowMs: Date.now(),
    });
    emailed = sent.ok;
    if (!sent.ok) emailError = sent.error;
  }

  return NextResponse.json({
    ok: true,
    saved,
    emailed,
    emailError,
    label: {
      tracking: label.tracking,
      carrier,
      labelUrl: label.labelUrl,
      amount: label.amount,
    },
    ...(saved
      ? {}
      : { warning: "The label was bought, but saving it to the order failed. Copy the tracking number before leaving this page." }),
  });
}
