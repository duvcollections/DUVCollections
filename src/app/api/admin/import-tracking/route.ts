import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AccessError } from "@/lib/access";
import { listOrders, markShipped } from "@/lib/orders-admin";
import { parseTrackingCsv } from "@/lib/shipping-csv";
import { sendShippedEmail, trackingUrl } from "@/lib/email";

export type ImportOutcome = {
  ref: string;
  ok: boolean;
  emailed: boolean;
  detail: string;
};

/**
 * Take the tracking export back from Pirate Ship and close out the orders.
 *
 * Every row is reported individually. A partial failure in the middle must not
 * look like a total failure, or you re-run the import and email half your
 * customers twice — so rows already marked shipped are skipped, and the
 * response says exactly which ones did what.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (err) {
    const msg = err instanceof AccessError ? err.message : "Not authorised.";
    return NextResponse.json({ error: msg }, { status: 403 });
  }

  let body: { csv?: string; notify?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const csv = String(body.csv ?? "");
  if (!csv.trim()) {
    return NextResponse.json({ error: "Paste the tracking export first." }, { status: 400 });
  }
  if (csv.length > 200_000) {
    return NextResponse.json({ error: "That's a very large paste — split it in two." }, { status: 400 });
  }

  const notify = body.notify !== false;
  const { rows, problems } = parseTrackingCsv(csv);

  if (rows.length === 0) {
    return NextResponse.json({
      error: "Couldn't read a single order out of that. Check you pasted the tracking export and not the address file.",
      problems,
    }, { status: 400 });
  }

  // One order list for the whole batch, rather than a Stripe lookup per row.
  const orders = await listOrders(100);
  const byRef = new Map(orders.map((o) => [o.ref, o]));

  const outcomes: ImportOutcome[] = [];

  for (const row of rows) {
    const order = byRef.get(row.ref);
    if (!order) {
      outcomes.push({ ref: row.ref, ok: false, emailed: false, detail: "No matching order in the last 100." });
      continue;
    }
    if (order.tracking) {
      outcomes.push({
        ref: row.ref,
        ok: true,
        emailed: false,
        detail: `Already shipped with ${order.tracking} — left alone.`,
      });
      continue;
    }

    const carrier = row.carrier ?? "USPS";
    try {
      await markShipped(order.id, carrier, row.tracking);
    } catch (err) {
      outcomes.push({
        ref: row.ref,
        ok: false,
        emailed: false,
        detail: `Couldn't save to Stripe: ${(err as Error).message}`,
      });
      continue;
    }

    if (!notify || !order.email) {
      outcomes.push({ ref: row.ref, ok: true, emailed: false, detail: `Marked shipped via ${carrier}.` });
      continue;
    }

    // The order is already shipped in Stripe. A mail failure is reported, but
    // it must never make the row look like the shipping status didn't save.
    const sent = await sendShippedEmail({
      to: order.email,
      name: order.name,
      orderRef: order.ref,
      sessionId: order.id,
      carrier,
      tracking: row.tracking,
      trackingUrl: trackingUrl(carrier, row.tracking),
      items: order.items.map((i) => ({ title: i.title, qty: i.qty })),
      total: order.total,
      nowMs: Date.now(),
    });

    outcomes.push({
      ref: row.ref,
      ok: true,
      emailed: sent.ok,
      detail: sent.ok
        ? `Marked shipped via ${carrier} and emailed ${order.email}.`
        : `Marked shipped via ${carrier}, but the email failed: ${sent.error}`,
    });
  }

  return NextResponse.json({ ok: true, outcomes, problems });
}
