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

/** Every message uses the same shell, so one style change lands everywhere. */
function shell(opts: { eyebrow: string; heading: string; body: string }): string {
  return `<!doctype html><html><body style="margin:0;background:${INK.shell};
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:${INK.plum}">
    <div style="max-width:560px;margin:0 auto;padding:40px 24px">
      <p style="font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:${INK.pink};margin:0">
        ${escapeHtml(opts.eyebrow)}</p>
      <h1 style="font-size:30px;line-height:1.1;letter-spacing:-.02em;margin:14px 0 0">
        ${escapeHtml(opts.heading)}</h1>
      ${opts.body}
      <p style="font-size:11px;color:${INK.faint};margin-top:32px;line-height:1.6">
        ${escapeHtml(site.legalName)} · You're receiving this because you placed an order
        at duvcollections.com. This is a one-off notification, not a mailing list.</p>
    </div></body></html>`;
}

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:${INK.pink};color:#fff;
    text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px">${escapeHtml(label)}</a>`;

const itemTable = (items: { title: string; qty: number }[], total: number, caption: string) => `
  <table style="width:100%;border-collapse:collapse;margin:28px 0;font-size:14px">
    <tr><td colspan="2" style="padding-bottom:8px;font-size:11px;font-weight:700;
      letter-spacing:.15em;text-transform:uppercase;color:${INK.faint}">${escapeHtml(caption)}</td></tr>
    ${items
      .map(
        (i) => `<tr><td style="padding:6px 0;color:${INK.muted}">${escapeHtml(i.title)}</td>
      <td style="padding:6px 0;text-align:right;color:${INK.plum};font-weight:600">×${i.qty}</td></tr>`,
      )
      .join("")}
    <tr><td style="padding-top:12px;border-top:1px solid ${INK.line};font-weight:700">Total paid</td>
      <td style="padding-top:12px;border-top:1px solid ${INK.line};text-align:right;font-weight:700">
      ${money(total)}</td></tr>
  </table>`;

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
  items: { title: string; qty: number }[];
  total: number;
  nowMs: number;
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

  const html = shell({
    eyebrow: site.name,
    heading: "Thanks — we've got your order",
    body: `
      <p style="font-size:16px;line-height:1.6;color:${INK.muted}">
        ${o.name ? `Hi ${escapeHtml(o.name.split(" ")[0])}, w` : "W"}e're packing
        <strong style="color:${INK.plum}">${escapeHtml(o.orderRef)}</strong> now. Orders leave us
        within ${site.policy.handlingDays}, and you'll get a tracking number by email the moment
        the label is bought.</p>
      <div style="margin:28px 0">${button(link, "Track this order")}</div>
      <p style="font-size:13px;color:${INK.muted};line-height:1.6">
        That link works for ${site.policy.returnWindowDays >= 30 ? "the next few months" : "a while"}
        — no reference to type and no account to create. Keep this email if you want it handy.</p>
      ${itemTable(o.items, o.total, "Your order")}
      ${helpLine(o.orderRef)}`,
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
