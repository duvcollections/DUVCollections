import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AccessError } from "@/lib/access";
import { stripeClient, secret } from "@/lib/stripe";
import { createDiscount, setDiscountActive, type NewDiscount } from "@/lib/discounts";

/**
 * Create and deactivate discount codes.
 *
 * Admin-only, and behind the same Access check as everything else under
 * /admin — a discount endpoint left open is a free-money endpoint.
 */

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof AccessError ? err.message : "Not authorised." },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  let stripe;
  try {
    stripe = stripeClient(await secret("STRIPE_SECRET_KEY"));
  } catch {
    return NextResponse.json({ error: "Stripe isn't configured." }, { status: 503 });
  }

  // Toggling an existing code active/inactive.
  if (typeof body.id === "string") {
    const result = await setDiscountActive(stripe, body.id, body.active === true);
    return result.ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: result.error }, { status: 502 });
  }

  const kind = body.kind === "amount" ? "amount" : "percent";
  const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const d: NewDiscount = {
    code: String(body.code ?? ""),
    kind,
    value: num(body.value) ?? 0,
    maxRedemptions: num(body.maxRedemptions),
    expiresOn: typeof body.expiresOn === "string" && body.expiresOn ? body.expiresOn : null,
    minimumOrder: num(body.minimumOrder),
    oncePerCustomer: body.oncePerCustomer === true,
  };

  const result = await createDiscount(stripe, d);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, code: result.code });
}
