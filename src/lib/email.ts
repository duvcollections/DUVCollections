import { Resend } from "resend";
import { secret } from "@/lib/stripe";
import { site, money } from "@/lib/site";
import { orderTrackingLink } from "@/lib/order-token";

/**
 * Transactional email. Only ever sent about an order the customer placed, or in
 * reply to a message they sent us — never marketing, and never to an address we
 * weren't given directly.
 */

const INK = { plum: "#2E1065", muted: "#6F5A96", faint: "#9B8AB8", pink: "#FF2E93", line: "#EFE6EF", shell: "#FFFCF8" };

async function client(): Promise<Resend | null> {
  try {
    return new Resend(await secret("RESEND_API_KEY"));
  } catch {
    return null;
  }
}

const NOT_CONFIGURED = "Email isn't configured yet (RESEND_API_KEY missing).";

export type SendResult = { ok: true } | { ok: false; error: string };

/**
 * Every message uses the same shell, so one style change lands everywhere.
 *
 * Built with tables and inline styles because that is what email clients
 * actually support — Outlook renders with Word's engine, and flexbox, grid and
 * <style> blocks are all unreliable there. The logo is a hosted PNG rather than
 * an SVG for the same reason: SVG fails silently in Outlook and Gmail's app.
 *
 * `preheader` is the grey line the inbox shows next to the subject. Left unset
 * it grabs whatever text comes first, which is usually a stray fragment, so
 * every message sets it deliberately.
 */
function shell(opts: {
  eyebrow: string;
  heading: string;
  body: string;
  preheader?: string;
  /** Internal mail skips the shop footer — it isn't marketing to yourself. */
  internal?: boolean;
}): string {
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;
        mso-hide:all">${escapeHtml(opts.preheader)}</div>`
    : "";

  const shopFooter = opts.internal
    ? ""
    : `
      <tr><td style="padding:0 32px">
        <table role="presentation" width="100%" style="border-collapse:collapse;
          border-top:1px solid ${INK.line}">
          <tr><td style="padding:24px 0 0">
            <p style="font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;
              color:${INK.faint};margin:0 0 12px">Keep shopping</p>
            <p style="margin:0;font-size:14px;line-height:2">
              <a href="${site.url}/shop/printing-supplies" style="color:#7B3FF2;text-decoration:none">Printing supplies</a>
              <span style="color:${INK.line}"> &nbsp;·&nbsp; </span>
              <a href="${site.url}/shop/jewelry" style="color:#7B3FF2;text-decoration:none">Jewelry</a>
              <span style="color:${INK.line}"> &nbsp;·&nbsp; </span>
              <a href="${site.url}/shop/eyewear" style="color:#7B3FF2;text-decoration:none">Eyewear</a>
              <span style="color:${INK.line}"> &nbsp;·&nbsp; </span>
              <a href="${site.url}/custom-printing" style="color:#7B3FF2;text-decoration:none">Custom printing</a>
            </p>
          </td></tr>
        </table>
      </td></tr>`;

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(opts.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${INK.shell};
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  color:${INK.plum};-webkit-font-smoothing:antialiased">
${preheader}
<table role="presentation" width="100%" style="border-collapse:collapse;background:${INK.shell}">
  <tr><td align="center" style="padding:32px 16px">

    <table role="presentation" width="600" style="width:100%;max-width:600px;border-collapse:collapse">

      <!-- masthead -->
      <tr><td style="padding:0 0 20px">
        <a href="${site.url}" style="text-decoration:none">
          <img src="${site.url}/brand/logo/duv-logo.png" width="168" alt="${escapeHtml(site.name)}"
            style="display:block;width:168px;max-width:168px;height:auto;border:0">
        </a>
      </td></tr>

      <!-- card -->
      <tr><td style="background:#ffffff;border:1px solid ${INK.line};border-radius:20px">
        <table role="presentation" width="100%" style="border-collapse:collapse">

          <tr><td style="height:4px;background:${INK.pink};border-radius:20px 20px 0 0;
            font-size:0;line-height:0">&nbsp;</td></tr>

          <tr><td style="padding:32px 32px 0">
            <p style="font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;
              color:${INK.pink};margin:0">${escapeHtml(opts.eyebrow)}</p>
            <h1 style="font-size:28px;line-height:1.15;letter-spacing:-.02em;margin:12px 0 0;
              color:${INK.plum};font-weight:800">${escapeHtml(opts.heading)}</h1>
          </td></tr>

          <tr><td style="padding:0 32px 8px">${opts.body}</td></tr>

          ${shopFooter}

          <tr><td style="padding:28px 32px 32px">
            <p style="font-size:11.5px;color:${INK.faint};margin:0;line-height:1.7">
              ${
                opts.internal
                  ? `Sent to you by your own shop because a payment cleared. ` +
                    `${escapeHtml(site.name)} admin notification.`
                  : `${escapeHtml(site.legalName)} · ${escapeHtml(site.contact.support)}<br>` +
                    `You're receiving this because you placed an order at duvcollections.com. ` +
                    `This is a one-off notification about that order, not a mailing list.`
              }
            </p>
          </td></tr>

        </table>
      </td></tr>

      ${
        opts.internal
          ? ""
          : `<tr><td style="padding:20px 8px 0;text-align:center">
        <p style="font-size:11.5px;color:${INK.faint};margin:0;line-height:1.6">
          Shipped from the USA · ${escapeHtml(site.external.ebayOrders)} orders,
          ${escapeHtml(site.external.ebayFeedback)} feedback on eBay
        </p>
      </td></tr>`
      }

    </table>
  </td></tr>
</table>
</body></html>`;
}

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:${INK.pink};color:#fff;
    text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px">${escapeHtml(label)}</a>`;

/**
 * The order summary block.
 *
 * Shows a breakdown when the figures are supplied. "Total paid" alone invites
 * "why is it $15.13 when the pendant was $7.99" — which is a support email that
 * a shipping and tax line would have prevented.
 */
const itemTable = (
  items: { title: string; qty: number; amount?: number }[],
  total: number,
  caption: string,
  breakdown?: { subtotal: number; shipping: number; tax: number },
) => {
  const rows = items
    .map(
      (i) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${INK.line};font-size:14px;
          color:${INK.plum};line-height:1.4">${escapeHtml(i.title)}
          <span style="color:${INK.faint}">× ${i.qty}</span></td>
        <td style="padding:10px 0;border-bottom:1px solid ${INK.line};text-align:right;
          font-size:14px;color:${INK.plum};font-weight:600;white-space:nowrap">${
            i.amount === undefined ? "" : money(i.amount)
          }</td>
      </tr>`,
    )
    .join("");

  const line = (label: string, value: string, strong = false) => `<tr>
      <td style="padding:${strong ? "12px 0 0" : "6px 0 0"};font-size:${strong ? "15px" : "13.5px"};
        color:${strong ? INK.plum : INK.muted};font-weight:${strong ? "700" : "400"}">${label}</td>
      <td style="padding:${strong ? "12px 0 0" : "6px 0 0"};text-align:right;
        font-size:${strong ? "15px" : "13.5px"};color:${strong ? INK.plum : INK.muted};
        font-weight:${strong ? "700" : "500"};white-space:nowrap">${value}</td>
    </tr>`;

  const totals = breakdown
    ? line("Subtotal", money(breakdown.subtotal)) +
      line("Shipping", breakdown.shipping === 0 ? "Free" : money(breakdown.shipping)) +
      (breakdown.tax > 0 ? line("Sales tax", money(breakdown.tax)) : "") +
      line("Total paid", money(total), true)
    : line("Total paid", money(total), true);

  return `
  <div style="margin:28px 0;padding:20px;background:${INK.shell};border-radius:14px">
    <p style="font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;
      color:${INK.faint};margin:0 0 4px">${escapeHtml(caption)}</p>
    <table role="presentation" width="100%" style="border-collapse:collapse">
      ${rows}
      ${totals}
    </table>
  </div>`;
};

const helpLine = (ref: string) => `
  <p style="font-size:13px;color:${INK.muted};line-height:1.7">
    Something not right? Reply to this email or write to
    <a href="mailto:${site.contact.support}" style="color:#7B3FF2">${site.contact.support}</a>,
    quoting ${escapeHtml(ref)}.
    You have ${site.policy.returnWindowDays} days from delivery to start a return.</p>`;

/* ------------------------------------------------------------------ order confirmation */

export type ConfirmationEmail = {
  to: string;
  name: string | null;
  orderRef: string;
  sessionId: string;
  items: { title: string; qty: number; amount?: number }[];
  total: number;
  nowMs: number;
  /** Optional: shows a subtotal/shipping/tax breakdown instead of a bare total. */
  breakdown?: { subtotal: number; shipping: number; tax: number };
  /** Optional: rendered as the delivery address so the customer can check it. */
  addressLines?: string[];
};

/**
 * Sent the moment payment clears. Stripe already emails a receipt; this is the
 * one that carries the tracking link, so the customer never has to type an order
 * reference into a form to find out where their parcel is.
 */
export async function sendConfirmationEmail(o: ConfirmationEmail): Promise<SendResult> {
  const resend = await client();
  if (!resend) return { ok: false, error: NOT_CONFIGURED };

  const link = await orderTrackingLink(site.url, o.sessionId, o.nowMs);

  const contactHref = `${site.url}/contact?ref=${encodeURIComponent(o.orderRef)}&topic=${encodeURIComponent("Order or delivery question")}`;

  const address = o.addressLines?.length
    ? `
      <div style="margin:0 0 28px;padding:18px 20px;border:1px solid ${INK.line};border-radius:14px">
        <p style="font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;
          color:${INK.faint};margin:0 0 8px">Delivering to</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:${INK.plum}">
          ${o.addressLines.map((l) => escapeHtml(l)).join("<br>")}</p>
        <p style="margin:10px 0 0;font-size:12.5px;color:${INK.muted};line-height:1.6">
          Wrong address? Tell us before the label is printed and we'll change it free.</p>
      </div>`
    : "";

  const html = shell({
    eyebrow: "Order confirmed",
    heading: "Thanks — we've got your order",
    preheader: `${o.orderRef} · ${money(o.total)} · dispatched within ${site.policy.handlingDays}`,
    body: `
      <p style="font-size:16px;line-height:1.65;color:${INK.muted};margin:16px 0 0">
        ${o.name ? `Hi ${escapeHtml(o.name.split(" ")[0])}, w` : "W"}e're packing
        <strong style="color:${INK.plum}">${escapeHtml(o.orderRef)}</strong> now.</p>

      <!-- The three things every customer wants to know, without reading a paragraph. -->
      <table role="presentation" width="100%" style="border-collapse:collapse;margin:24px 0 4px">
        <tr>
          <td width="50%" style="padding:14px 16px;background:${INK.shell};border-radius:12px;
            vertical-align:top">
            <p style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
              color:${INK.faint};margin:0 0 4px">Dispatch</p>
            <p style="font-size:14px;font-weight:700;color:${INK.plum};margin:0">
              ${site.policy.handlingDays}</p>
          </td>
          <td width="8" style="font-size:0">&nbsp;</td>
          <td width="50%" style="padding:14px 16px;background:${INK.shell};border-radius:12px;
            vertical-align:top">
            <p style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
              color:${INK.faint};margin:0 0 4px">Then delivery</p>
            <p style="font-size:14px;font-weight:700;color:${INK.plum};margin:0">
              ${site.policy.deliveryEstimate.replace(" after dispatch", "")}</p>
          </td>
        </tr>
      </table>

      <p style="font-size:14px;line-height:1.65;color:${INK.muted};margin:20px 0 0">
        You'll get a tracking number by email the moment the label is bought.</p>

      <div style="margin:24px 0 8px">${button(link, "Track this order")}</div>
      <p style="font-size:12.5px;color:${INK.faint};line-height:1.6;margin:0 0 4px">
        No reference to type, no account to create. The link stays live for months.</p>

      ${itemTable(o.items, o.total, "Your order", o.breakdown)}

      ${address}

      <div style="padding:18px 20px;background:${INK.shell};border-radius:14px">
        <p style="font-size:14px;font-weight:700;color:${INK.plum};margin:0 0 6px">
          Something not right?</p>
        <p style="font-size:13.5px;color:${INK.muted};line-height:1.65;margin:0 0 14px">
          Your reference is filled in already — just tell us what's wrong. You have
          ${site.policy.returnWindowDays} days from delivery to start a return.</p>
        <a href="${contactHref}" style="display:inline-block;background:#ffffff;
          border:2px solid ${INK.plum};color:${INK.plum};text-decoration:none;font-weight:700;
          font-size:13.5px;padding:10px 22px;border-radius:999px">Contact us about this order</a>
      </div>`,
  });

  return send(resend, {
    to: o.to,
    subject: `We've got your ${site.name} order — ${o.orderRef}`,
    html,
  });
}

/* ------------------------------------------------------------------------- shipped */

export type ShippedEmail = {
  to: string;
  name: string | null;
  orderRef: string;
  sessionId: string;
  carrier: string;
  tracking: string;
  trackingUrl: string | null;
  items: { title: string; qty: number }[];
  total: number;
  nowMs: number;
};

export async function sendShippedEmail(o: ShippedEmail): Promise<SendResult> {
  const resend = await client();
  if (!resend) return { ok: false, error: NOT_CONFIGURED };

  const link = await orderTrackingLink(site.url, o.sessionId, o.nowMs);

  const trackBlock = o.trackingUrl
    ? button(o.trackingUrl, "Track your parcel")
    : `<p style="font-family:ui-monospace,Menlo,monospace;font-size:18px;font-weight:700;color:${INK.plum}">
        ${escapeHtml(o.tracking)}</p>`;

  const html = shell({
    eyebrow: site.name,
    heading: "Your order is on its way",
    body: `
      <p style="font-size:16px;line-height:1.6;color:${INK.muted}">
        ${o.name ? `Hi ${escapeHtml(o.name.split(" ")[0])}, y` : "Y"}our order
        <strong style="color:${INK.plum}">${escapeHtml(o.orderRef)}</strong> shipped today
        via ${escapeHtml(o.carrier)}.</p>
      <div style="margin:28px 0">${trackBlock}</div>
      <p style="font-size:13px;color:${INK.muted};line-height:1.6">
        ${escapeHtml(o.carrier)} tracking number
        <strong style="color:${INK.plum};font-family:ui-monospace,Menlo,monospace">${escapeHtml(o.tracking)}</strong>.
        Tracking can take a few hours to show its first scan — that's the carrier, not the parcel.
        Delivery normally takes ${site.policy.deliveryEstimate}.</p>
      <p style="font-size:13px;color:${INK.muted};line-height:1.6">
        Or see everything about this order on
        <a href="${link}" style="color:#7B3FF2">your order page</a>.</p>
      ${itemTable(o.items, o.total, "In this parcel")}
      ${helpLine(o.orderRef)}`,
  });

  return send(resend, {
    to: o.to,
    subject: `Your ${site.name} order has shipped — ${o.orderRef}`,
    html,
  });
}

/* ------------------------------------------------------------------ contact enquiry */

export type ContactEmail = {
  name: string;
  from: string;
  topic: string;
  orderRef: string | null;
  message: string;
};

/**
 * A message from the contact form, delivered to the inbox that handles enquiries.
 *
 * Sent *from* our own verified domain with `replyTo` set to the customer, never
 * from their address. Forging their address would fail our own SPF and DKIM and
 * land the message in spam — which is exactly the failure mode where you never
 * find out you missed a sale.
 */
export async function sendContactEmail(c: ContactEmail): Promise<SendResult> {
  const resend = await client();
  if (!resend) return { ok: false, error: NOT_CONFIGURED };

  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 14px 6px 0;color:${INK.faint};white-space:nowrap">${escapeHtml(k)}</td>
      <td style="padding:6px 0;color:${INK.plum};font-weight:600">${escapeHtml(v)}</td></tr>`;

  const html = shell({
    eyebrow: "Contact form",
    heading: c.topic,
    body: `
      <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px">
        ${row("From", `${c.name} <${c.from}>`)}
        ${c.orderRef ? row("Order", c.orderRef) : ""}
      </table>
      <div style="border-left:3px solid ${INK.line};padding:4px 0 4px 16px;font-size:15px;
        line-height:1.7;color:${INK.plum};white-space:pre-wrap">${escapeHtml(c.message)}</div>
      <p style="font-size:13px;color:${INK.muted};line-height:1.7;margin-top:24px">
        Reply to this email and it goes straight to ${escapeHtml(c.from)}.</p>`,
  });

  return send(resend, {
    to: site.contact.support,
    replyTo: c.from,
    subject: `${c.topic}${c.orderRef ? ` — ${c.orderRef}` : ""} — ${c.name}`,
    html,
  });
}

/* ------------------------------------------------------------------ low stock */

export type LowStockEmail = {
  to: string;
  items: { sku: string; title: string; stock: number; lowStockAt: number }[];
  orderRef: string;
};

/**
 * Tells you a sale took something to its low-stock line.
 *
 * Sent once per crossing, not once per order — an alert that fires on every
 * sale while a product sits low is an alert you learn to ignore, which is worse
 * than not having one.
 */
export async function sendLowStockEmail(o: LowStockEmail): Promise<SendResult> {
  const resend = await client();
  if (!resend) return { ok: false, error: NOT_CONFIGURED };

  const rows = o.items
    .map(
      (i) => `<tr>
        <td style="padding:8px 14px 8px 0;color:${INK.plum};font-weight:600">${escapeHtml(i.title)}</td>
        <td style="padding:8px 14px 8px 0;color:${INK.faint};font-family:ui-monospace,Menlo,monospace;font-size:13px">${escapeHtml(i.sku)}</td>
        <td style="padding:8px 0;text-align:right;color:${i.stock === 0 ? "#e34948" : INK.plum};font-weight:700">
          ${i.stock === 0 ? "Out of stock" : `${i.stock} left`}
        </td></tr>`,
    )
    .join("");

  const html = shell({
    eyebrow: "Stock alert",
    heading: o.items.length === 1 ? "One product is running low" : `${o.items.length} products are running low`,
    body: `
      <p style="font-size:16px;line-height:1.6;color:${INK.muted}">
        Order <strong style="color:${INK.plum}">${escapeHtml(o.orderRef)}</strong> took these to
        or below their low-stock level.</p>
      <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px">${rows}</table>
      <div style="margin:28px 0">${button(`${site.url}/admin/products`, "Open the product list")}</div>
      <p style="font-size:13px;color:${INK.muted};line-height:1.7">
        You'll get one message per product per time it crosses the line — not one per order —
        so this stays worth reading.</p>`,
  });

  return send(resend, {
    to: o.to,
    subject:
      o.items.length === 1
        ? `Low stock: ${o.items[0].title}`
        : `Low stock: ${o.items.length} products`,
    html,
  });
}

/* --------------------------------------------------------------------- refund */

export type RefundEmail = {
  to: string;
  name: string | null;
  orderRef: string;
  amount: number;
  full: boolean;
  note: string | null;
};

/**
 * Confirms a refund. Sent because the alternative is a customer watching their
 * bank for days wondering whether you actually did it — which becomes a
 * chargeback far more often than it becomes a polite follow-up.
 */
export async function sendRefundEmail(o: RefundEmail): Promise<SendResult> {
  const resend = await client();
  if (!resend) return { ok: false, error: NOT_CONFIGURED };

  const html = shell({
    eyebrow: site.name,
    heading: o.full ? "Your refund is on its way" : "A partial refund is on its way",
    body: `
      <p style="font-size:16px;line-height:1.6;color:${INK.muted}">
        ${o.name ? `Hi ${escapeHtml(o.name.split(" ")[0])}, w` : "W"}e've refunded
        <strong style="color:${INK.plum}">${money(o.amount)}</strong> against order
        <strong style="color:${INK.plum}">${escapeHtml(o.orderRef)}</strong>.</p>
      ${o.note ? `<p style="font-size:15px;line-height:1.7;color:${INK.plum};border-left:3px solid ${INK.line};padding-left:16px">${escapeHtml(o.note)}</p>` : ""}
      <p style="font-size:13px;color:${INK.muted};line-height:1.7">
        It goes back to the card you paid with. Banks usually show it within
        5–10 business days — that wait is theirs, not ours, and there's nothing
        further you need to do.</p>
      <p style="font-size:13px;color:${INK.muted};line-height:1.7">
        Questions? Reply to this email or write to
        <a href="mailto:${site.contact.support}" style="color:#7B3FF2">${site.contact.support}</a>,
        quoting ${escapeHtml(o.orderRef)}.</p>`,
  });

  return send(resend, {
    to: o.to,
    subject: `Refund confirmed — ${o.orderRef}`,
    html,
  });
}

/* --------------------------------------------------------------------------- send */

async function send(
  resend: Resend,
  msg: { to: string; subject: string; html: string; replyTo?: string },
): Promise<SendResult> {
  try {
    const { error } = await resend.emails.send({
      from: `${site.name} <${site.contact.sales}>`,
      replyTo: msg.replyTo ?? site.contact.support,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

/** Best-effort tracking URL from the carrier name. */
export function trackingUrl(carrier: string, tracking: string): string | null {
  const t = encodeURIComponent(tracking.trim());
  switch (carrier.toLowerCase()) {
    case "usps": return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${t}`;
    case "ups": return `https://www.ups.com/track?tracknum=${t}`;
    case "fedex": return `https://www.fedex.com/fedextrack/?trknbr=${t}`;
    case "dhl": return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${t}`;
    default: return null;
  }
}

/* ------------------------------------------------------------ abandoned cart */

export type AbandonedCartEmail = {
  to: string;
  name: string | null;
  items: { title: string; qty: number }[];
  recoveryUrl: string;
};

/**
 * Sent when a checkout is started and not finished.
 *
 * This one is different from every other message in this file, and the
 * difference matters legally as well as ethically: the others are transactional
 * (a person bought something and we are telling them about it), while this is a
 * marketing message to someone who did NOT complete a purchase. Under CAN-SPAM
 * that obliges us to identify the sender with a physical postal address and to
 * offer a way out — so this message carries its own footer rather than the
 * shared one, which says "this is not a mailing list".
 *
 * Stripe gives us the email only when the customer actually typed one before
 * leaving, so this can only ever reach people who handed it over on our
 * checkout page.
 */
export async function sendAbandonedCartEmail(o: AbandonedCartEmail): Promise<SendResult> {
  const resend = await client();
  if (!resend) return { ok: false, error: NOT_CONFIGURED };

  const { address } = site.privateContact;
  const rows = o.items
    .map(
      (i) => `<tr>
        <td style="padding:6px 0;color:${INK.muted}">${escapeHtml(i.title)}</td>
        <td style="padding:6px 0;text-align:right;color:${INK.plum};font-weight:600">×${i.qty}</td>
      </tr>`,
    )
    .join("");

  const html = `<!doctype html><html><body style="margin:0;background:${INK.shell};
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:${INK.plum}">
    <div style="max-width:560px;margin:0 auto;padding:40px 24px">
      <p style="font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:${INK.pink};margin:0">
        ${escapeHtml(site.name)}</p>
      <h1 style="font-size:30px;line-height:1.1;letter-spacing:-.02em;margin:14px 0 0">
        You left something behind</h1>
      <p style="font-size:16px;line-height:1.6;color:${INK.muted}">
        ${o.name ? `Hi ${escapeHtml(o.name.split(" ")[0])}, y` : "Y"}our cart is still here.
        Nothing has been charged, and we've held it for you.</p>
      <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px">${rows}</table>
      <div style="margin:28px 0">${button(o.recoveryUrl, "Finish your order")}</div>
      <p style="font-size:13px;color:${INK.muted};line-height:1.7">
        Stock isn't reserved, so anything low may sell before you get back.
        Questions? Just reply to this email.</p>
      <p style="font-size:11px;color:${INK.faint};margin-top:32px;line-height:1.6">
        ${escapeHtml(site.legalName)}, ${escapeHtml(address.line1)},
        ${escapeHtml(address.city)}, ${escapeHtml(address.state)} ${escapeHtml(address.postalCode)}<br>
        You're receiving this one-off reminder because you entered your email at our checkout
        and didn't finish. We won't email you about this cart again.
        To hear nothing further, reply with "unsubscribe" and we'll remove you.</p>
    </div></body></html>`;

  return send(resend, { to: o.to, subject: "You left something in your cart", html });
}

/* ------------------------------------------------------------- new order (internal) */

export type NewOrderEmail = {
  to: string;
  orderRef: string;
  sessionId: string;
  customerName: string | null;
  customerEmail: string | null;
  items: { title: string; qty: number }[];
  total: number;
  /** Shipping address, already flattened to lines. Empty if none was collected. */
  addressLines: string[];
};

/**
 * Tells you a sale happened.
 *
 * Written to be *acted on*, not admired: what sold, how many, where it goes,
 * and one button to the order. Deliberately plainer than the customer-facing
 * mail — this is a work order, and decoration between you and the address is
 * friction when you are packing a parcel.
 */
export async function sendNewOrderEmail(o: NewOrderEmail): Promise<SendResult> {
  const resend = await client();
  if (!resend) return { ok: false, error: NOT_CONFIGURED };

  const rows = o.items
    .map(
      (i) => `<tr>
        <td style="padding:8px 14px 8px 0;font-size:14px;color:${INK.plum};font-weight:600;
          line-height:1.4">${escapeHtml(i.title)}</td>
        <td style="padding:8px 0;text-align:right;font-size:15px;color:${INK.plum};
          font-weight:700;white-space:nowrap">× ${i.qty}</td>
      </tr>`,
    )
    .join("");

  // One-line address for the inbox preview, so you can triage without opening.
  const addressSummary = o.addressLines.length
    ? o.addressLines[o.addressLines.length - 2] ?? o.addressLines[0]
    : "no address";

  const address = o.addressLines.length
    ? o.addressLines.map((l) => escapeHtml(l)).join("<br>")
    : '<span style="color:#c0332f">No shipping address on this order</span>';

  const html = shell({
    eyebrow: "New order",
    heading: `${money(o.total)} — ${o.orderRef}`,
    preheader: `${o.customerName ?? "Customer"} · ${o.items.reduce((n, i) => n + i.qty, 0)} item(s) · ${addressSummary}`,
    internal: true,
    body: `
      <p style="font-size:14px;color:${INK.muted};margin:14px 0 0;line-height:1.6">
        ${escapeHtml(o.customerName ?? "Name not given")}${
          o.customerEmail
            ? ` · <a href="mailto:${escapeHtml(o.customerEmail)}" style="color:#7B3FF2">${escapeHtml(o.customerEmail)}</a>`
            : ""
        }</p>

      <div style="margin:24px 0;padding:20px;background:${INK.shell};border-radius:14px">
        <p style="font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;
          color:${INK.faint};margin:0 0 4px">Pack this</p>
        <table role="presentation" width="100%" style="border-collapse:collapse">${rows}</table>
      </div>

      <div style="margin:0 0 24px;padding:18px 20px;border:1px solid ${INK.line};border-radius:14px">
        <p style="font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;
          color:${INK.faint};margin:0 0 8px">Ship to</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:${INK.plum}">${address}</p>
      </div>

      <div style="margin:0 0 8px">${button(`${site.url}/admin/orders/${o.sessionId}`, "Open this order")}</div>

      <p style="font-size:12.5px;color:${INK.faint};margin:16px 0 0;line-height:1.6">
        Stock has already been adjusted. Buy the shipping label from the order page above.</p>`,
  });

  return send(resend, {
    to: o.to,
    // Reply goes to the customer, not to ourselves — so hitting reply on a
    // notification actually reaches the person who ordered.
    replyTo: o.customerEmail ?? site.contact.support,
    subject: `New order ${o.orderRef} — ${money(o.total)}`,
    html,
  });
}
