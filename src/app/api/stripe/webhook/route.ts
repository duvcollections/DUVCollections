import { NextRequest, NextResponse } from "next/server";
import { stripeClient, cryptoProvider, secret } from "@/lib/stripe";
import { sendConfirmationEmail, sendLowStockEmail, sendAbandonedCartEmail } from "@/lib/email";
import { applyStockForOrder, lowStockCrossings, claimCartReminder } from "@/lib/products-repo";
import { site } from "@/lib/site";


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

      // Take the sold items off the shelf before anything else. This is the
      // only place stock moves automatically, and it is idempotent by way of
      // the stock_applied table — Stripe redelivers events, and a shop that
      // decrements on every delivery oversells.
      //
      // Wrapped like everything else here: a stock failure must not produce a
      // non-2xx, because Stripe would then retry the whole event for days.
      try {
        const lines = parseSkus(s.metadata?.skus);
        if (lines.length > 0) {
          const moves = await applyStockForOrder(s.id, lines, "stripe-webhook");
          if (moves === null) {
            console.log(`[stock] ${s.id} already counted — retry ignored`);
          } else if (moves.length > 0) {
            console.log(`[stock] ${s.id}: ${moves.map((m) => `${m.sku} ${m.before}→${m.after}`).join(", ")}`);
            const low = await lowStockCrossings(moves);
            if (low.length > 0) {
              const sent = await sendLowStockEmail({
                to: site.contact.admin,
                items: low,
                orderRef: s.id.slice(-12).toUpperCase(),
              });
              if (!sent.ok) console.error(`[stock] low-stock email failed: ${sent.error}`);
            }
          }
        }
      } catch (err) {
        console.error("[stock] could not apply stock:", err);
      }

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

    case "checkout.session.expired": {
      const s = event.data.object;
      const email = s.customer_details?.email;

      // No email means they never got far enough to give us one. There is
      // nobody to write to, and that is the end of it.
      if (!email) {
        console.log(`[cart] ${s.id} expired with no email — nothing to send`);
        break;
      }

      try {
        // Claim first. A redelivered event must not produce a second email.
        if (!(await claimCartReminder(s.id, email))) {
          console.log(`[cart] ${s.id} already reminded — skipping`);
          break;
        }

        const full = await stripe.checkout.sessions.retrieve(s.id, { expand: ["line_items"] });
        const items =
          full.line_items?.data.map((li) => ({
            title: li.description ?? "Item",
            qty: li.quantity ?? 1,
          })) ?? [];

        // An expired session with no line items is not worth an email.
        if (items.length === 0) {
          console.log(`[cart] ${s.id} expired with no items — skipping`);
          break;
        }

        // Carry the basket in the link. The cart lives in localStorage, so a
        // bare /cart link shows an empty basket to anyone who opens the email
        // on their phone after adding items on a laptop.
        const restore = parseSkus(s.metadata?.skus);
        const recoveryUrl =
          restore.length > 0
            ? `${site.url}/cart?restore=${encodeURIComponent(
                restore.map((l) => `${l.sku}x${l.qty}`).join(","),
              )}`
            : `${site.url}/cart`;

        const result = await sendAbandonedCartEmail({
          to: email,
          name: s.customer_details?.name ?? null,
          items,
          recoveryUrl,
        });
        if (!result.ok) console.error(`[cart] reminder failed: ${result.error}`);
        else console.log(`[cart] reminder sent for ${s.id}`);
      } catch (err) {
        // Same rule as everywhere else here: never let this reach the return
        // below as a non-2xx, or Stripe retries the event for days.
        console.error("[cart] abandoned-cart handling threw:", err);
      }
      break;
    }

    case "checkout.session.async_payment_succeeded":
      console.log(`[order] async payment succeeded ${event.data.object.id}`);
      break;

    case "checkout.session.async_payment_failed":
      console.log(`[order] async payment FAILED ${event.data.object.id}`);
      break;

    case "charge.refunded": {
      // Catches refunds issued straight from the Stripe dashboard, which never
      // touch our admin route. Without this the order keeps showing as needing
      // dispatch and keeps counting toward revenue — the status is derived from
      // the Checkout Session, and a refunded session still says "paid".
      const charge = event.data.object;
      console.log(
        `[order] refunded charge ${charge.id} · ${(charge.amount_refunded / 100).toFixed(2)} of ` +
          `${(charge.amount / 100).toFixed(2)}`,
      );

      try {
        const pi = typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
        if (!pi) {
          console.log("[order] refunded charge has no payment intent — cannot match a session");
          break;
        }

        // Find the Checkout Session behind this charge. There is no direct
        // lookup from charge to session, so we go via the PaymentIntent.
        const sessions = await stripe.checkout.sessions.list({ payment_intent: pi, limit: 1 });
        const session = sessions.data[0];
        if (!session) {
          console.log(`[order] no checkout session for ${pi} — nothing to stamp`);
          break;
        }

        await stripe.checkout.sessions.update(session.id, {
          metadata: {
            refunded_amount: String(charge.amount_refunded),
            refunded: charge.amount_refunded >= charge.amount ? "full" : "partial",
          },
        });
        console.log(`[order] stamped ${session.id.slice(-12).toUpperCase()} as refunded`);
      } catch (err) {
        // Never rethrow: a non-2xx makes Stripe retry this event for days.
        console.error("[order] could not stamp refund:", err);
      }
      break;
    }

    case "charge.dispute.created":
      console.log(`[order] DISPUTE opened ${event.data.object.id} — respond in Stripe`);
      break;

    default:
      break;
  }

  // Always 200 on a verified event. A non-2xx makes Stripe retry for days.
  return NextResponse.json({ received: true });
}

/** `SKUx2,OTHERx1` → lines. Mirrors the format written at checkout. */
function parseSkus(raw: string | undefined): { sku: string; qty: number }[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => {
      const at = part.lastIndexOf("x");
      if (at < 1) return null;
      const qty = Number(part.slice(at + 1));
      if (!Number.isFinite(qty) || qty < 1) return null;
      return { sku: part.slice(0, at), qty: Math.floor(qty) };
    })
    .filter((l): l is { sku: string; qty: number } => l !== null);
}
