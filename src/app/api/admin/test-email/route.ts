import { NextResponse } from "next/server";
import { requireAdmin, AccessError } from "@/lib/access";
import { sendShippedEmail, trackingUrl } from "@/lib/email";

/**
 * Send the real shipping email to the signed-in admin.
 *
 * Mail is the part of a shop that fails silently. The API key can be wrong, the
 * domain unverified, the DNS records proxied by mistake — and you find out weeks
 * later when a customer says they never got tracking. This exercises the entire
 * path (key, verified domain, from-address, template, Resend's own accept) and
 * reports the actual error string when it breaks.
 *
 * It goes only to the address on the Access token. There is no "to" parameter,
 * so this can never be pointed at anyone else.
 */
export async function POST() {
  let actor: string;
  try {
    actor = (await requireAdmin()).email;
  } catch (err) {
    const msg = err instanceof AccessError ? err.message : "Not authorised.";
    return NextResponse.json({ error: msg }, { status: 403 });
  }

  const tracking = "9400111899223197428490";
  const sent = await sendShippedEmail({
    to: actor,
    name: "Test",
    orderRef: "TESTTESTTEST",
    // Not a real session, so the tracking link in this email resolves to the
    // ordinary lookup form. That is correct: the point is to prove mail sends,
    // not to fabricate an order.
    sessionId: "cs_test_email_check",
    carrier: "USPS",
    tracking,
    trackingUrl: trackingUrl("USPS", tracking),
    items: [
      { title: "DTF Hot Peel Film Roll 0.3 x 100m", qty: 1 },
      { title: "OtterPro DTF Powder — 500 g", qty: 2 },
    ],
    total: 110,
    nowMs: Date.now(),
  });

  if (!sent.ok) {
    console.error(`[admin] test email to ${actor} failed: ${sent.error}`);
    return NextResponse.json({ error: sent.error }, { status: 502 });
  }

  console.log(`[admin] test email sent to ${actor}`);
  return NextResponse.json({ ok: true, to: actor });
}
