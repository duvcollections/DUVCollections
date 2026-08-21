import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AccessError } from "@/lib/access";
import { getOrder, markShipped } from "@/lib/orders-admin";
import { sendShippedEmail, trackingUrl } from "@/lib/email";

export async function POST(req: NextRequest) {
  let actor: string;
  try {
    actor = (await requireAdmin()).email;
  } catch (err) {
    const msg = err instanceof AccessError ? err.message : "Not authorised.";
    return NextResponse.json({ error: msg }, { status: 403 });
  }

  let body: { id?: string; carrier?: string; tracking?: string; notify?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { id, carrier, tracking, notify } = body;
  if (!id || !carrier || !tracking?.trim()) {
    return NextResponse.json({ error: "Order, carrier and tracking number are all required." }, { status: 400 });
  }
  if (tracking.trim().length > 64) {
    return NextResponse.json({ error: "That tracking number looks too long." }, { status: 400 });
  }

  const existing = await getOrder(id);
  if (!existing) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  let order;
  try {
    order = await markShipped(id, carrier, tracking);
  } catch (err) {
    console.error("[admin] markShipped failed:", err);
    return NextResponse.json({ error: "Couldn't save to Stripe. Try again." }, { status: 502 });
  }

  console.log(`[admin] ${actor} marked ${order.ref} shipped via ${carrier} ${tracking}`);

  if (!notify || !order.email) {
    return NextResponse.json({ ok: true, emailed: false });
  }

  const sent = await sendShippedEmail({
    to: order.email,
    name: order.name,
    orderRef: order.ref,
    sessionId: order.id,
    carrier,
    tracking: tracking.trim(),
    trackingUrl: trackingUrl(carrier, tracking),
    items: order.items.map((i) => ({ title: i.title, qty: i.qty })),
    total: order.total,
    nowMs: Date.now(),
  });

  // The order is already marked shipped — a failed email must not undo that.
  return NextResponse.json({
    ok: true,
    emailed: sent.ok,
    ...(sent.ok ? {} : { emailError: sent.error }),
  });
}
