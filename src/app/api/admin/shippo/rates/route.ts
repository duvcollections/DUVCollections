import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AccessError } from "@/lib/access";
import { getOrder } from "@/lib/orders-admin";
import { getRates, ShippoError, type Parcel } from "@/lib/shippo";

/** Live rates for one order and one box. Read-only — spends nothing. */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof AccessError ? err.message : "Not authorised." },
      { status: 403 },
    );
  }

  let body: { id?: string; parcel?: Partial<Parcel> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { id } = body;
  if (!id) return NextResponse.json({ error: "Which order?" }, { status: 400 });

  const p = body.parcel ?? {};
  const parcel: Parcel = {
    lengthIn: num(p.lengthIn, 10),
    widthIn: num(p.widthIn, 7),
    heightIn: num(p.heightIn, 1),
    weightOz: num(p.weightOz, 0),
  };
  if (parcel.weightOz <= 0) {
    return NextResponse.json({ error: "Set a weight before asking for rates." }, { status: 400 });
  }
  if (parcel.weightOz > 1120) {
    return NextResponse.json({ error: "That's over 70 lb — split it into two parcels." }, { status: 400 });
  }

  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  try {
    return NextResponse.json({ ok: true, rates: await getRates(order, parcel) });
  } catch (err) {
    const message = err instanceof ShippoError ? err.message : "Couldn't fetch rates.";
    console.error(`[shippo] rates for ${order.ref}: ${message}`);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

const num = (v: unknown, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
