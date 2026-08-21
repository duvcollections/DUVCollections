import { NextRequest, NextResponse } from "next/server";
import { stripeClient, cryptoProvider, secret } from "@/lib/stripe";
import { sendConfirmationEmail } from "@/lib/email";


/**
 * Stripe webhook.
 *
 * The signature check is the whole point of this file. Without it, anyone who
 * finds the URL could POST a fake "payment succeeded" event and have goods
 * shipped for free. We verify against the signing secret before trusting a
 * single field, and we read the RAW body — parsing it first would break the HMAC.
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const raw = await req.text();

  let stripe, signingSecret;
  try {
    stripe = stripeClient(await secret("STRIPE_SECRET_KEY"));
    signingSecret = await secret("STRIPE_WEBHOOK_SECRET");
  } catch (err) {
    console.error("Webhook not configured:", (err as Error).message);
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      raw,
      signature,
      signingSecret,
      undefined,
      cryptoProvider(),
    );
  } catch (err) {
    // A failure here means the request did not come from Stripe. Reject it.
    console.error("Webhook signature verification failed:", (err as Error).message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      // Only act on sessions that are actually paid. `completed` can fire for
      // async payment methods that have not settled yet.
      if (s.payment_status !== "paid") {
        console.log(`[order] ${s.id} completed but unpaid (${s.payment_status}) — ignoring`);
        break;
      }
      console.log(
        `[order] PAID ${s.id} · ${s.customer_details?.email ?? "no email"} · ` +
          `${((s.amount_total ?? 0) / 100).toFixed(2)} ${s.currency?.toUpperCase()} · ` +
          `items ${s.metadata?.skus ?? "?"}`,
      );

      // Our own confirmation, carrying the one-click tracking link. Stripe's
      // receipt proves payment; this one tells them where the parcel is.
      //
      // Wrapped so a mail failure can never reach the return below. Stripe
      // retries any non-2xx for days, and a retried "payment succeeded" is how
      // a shop ends up shipping the same order twice.
      if (s.customer_details?.email) {
        try {
          const full = await stripe.checkout.sessions.retrieve(s.id, {
            expand: ["line_items"],
          });
          const result = await sendConfirmationEmail({
            to: s.customer_details.email,
            name: s.customer_details.name ?? null,
            orderRef: s.id.slice(-12).toUpperCase(),
            sessionId: s.id,
            items:
              full.line_items?.data.map((li) => ({
                title: li.description ?? "Item",
                qty: li.quantity ?? 1,
              })) ?? [],
            total: (s.amount_total ?? 0) / 100,
            nowMs: Date.now(),
          });
          if (!result.ok) console.error(`[order] confirmation email failed: ${result.error}`);
        } catch (err) {
          console.error("[order] confirmation email threw:", err);
        }
      }
      break;
    }

    case "checkout.session.async_payment_succeeded":
      console.log(`[order] async payment succeeded ${event.data.object.id}`);
      break;

    case "checkout.session.async_payment_failed":
      console.log(`[order] async payment FAILED ${event.data.object.id}`);
      break;

    case "charge.refunded":
      console.log(`[order] refunded ${event.data.object.id}`);
      break;

    case "charge.dispute.created":
      console.log(`[order] DISPUTE opened ${event.data.object.id} — respond in Stripe`);
      break;

    default:
      break;
  }

  // Always 200 on a verified event. A non-2xx makes Stripe retry for days.
  return NextResponse.json({ received: true });
}
