import { Resend } from "resend";
import { secret } from "@/lib/stripe";
import { site, money } from "@/lib/site";

/**
 * Transactional email. Only ever sent about an order the customer placed —
 * never marketing, and never to an address we weren't given at checkout.
 */

export type ShippedEmail = {
  to: string;
  name: string | null;
  orderRef: string;
  carrier: string;
  tracking: string;
  trackingUrl: string | null;
  items: { title: string; qty: number }[];
  total: number;
};

export async function sendShippedEmail(o: ShippedEmail): Promise<{ ok: true } | { ok: false; error: string }> {
  let resend: Resend;
  try {
    resend = new Resend(await secret("RESEND_API_KEY"));
  } catch {
    return { ok: false, error: "Email isn't configured yet (RESEND_API_KEY missing)." };
  }

  const itemLines = o.items
    .map((i) => `<tr><td style="padding:6px 0;color:#6F5A96">${escapeHtml(i.title)}</td>
      <td style="padding:6px 0;text-align:right;color:#2E1065;font-weight:600">×${i.qty}</td></tr>`)
    .join("");

  const trackBlock = o.trackingUrl
    ? `<a href="${o.trackingUrl}" style="display:inline-block;background:#FF2E93;color:#fff;
        text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px">Track your parcel</a>`
    : `<p style="font-family:ui-monospace,Menlo,monospace;font-size:18px;font-weight:700;color:#2E1065">
        ${escapeHtml(o.tracking)}</p>`;

  const html = `<!doctype html><html><body style="margin:0;background:#FFFCF8;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#2E1065">
    <div style="max-width:560px;margin:0 auto;padding:40px 24px">
      <p style="font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#FF2E93;margin:0">
        ${escapeHtml(site.name)}</p>
      <h1 style="font-size:30px;line-height:1.1;letter-spacing:-.02em;margin:14px 0 0">
        Your order is on its way</h1>
      <p style="font-size:16px;line-height:1.6;color:#6F5A96">
        ${o.name ? `Hi ${escapeHtml(o.name.split(" ")[0])}, y` : "Y"}our order
        <strong style="color:#2E1065">${escapeHtml(o.orderRef)}</strong> shipped today
        via ${escapeHtml(o.carrier)}.</p>
      <div style="margin:28px 0">${trackBlock}</div>
      <p style="font-size:13px;color:#6F5A96;line-height:1.6">
        Tracking can take a few hours to show its first scan — that's the carrier, not the parcel.
        Delivery normally takes ${site.policy.deliveryEstimate}.</p>
      <table style="width:100%;border-collapse:collapse;margin:28px 0;font-size:14px">
        <tr><td colspan="2" style="padding-bottom:8px;font-size:11px;font-weight:700;
          letter-spacing:.15em;text-transform:uppercase;color:#9B8AB8">In this parcel</td></tr>
        ${itemLines}
        <tr><td style="padding-top:12px;border-top:1px solid #EFE6EF;font-weight:700">Total paid</td>
          <td style="padding-top:12px;border-top:1px solid #EFE6EF;text-align:right;font-weight:700">
          ${money(o.total)}</td></tr>
      </table>
      <p style="font-size:13px;color:#6F5A96;line-height:1.7">
        Something not right? Reply to this email or write to
        <a href="mailto:${site.contact.support}" style="color:#7B3FF2">${site.contact.support}</a>.
        You have ${site.policy.returnWindowDays} days from delivery to start a return.</p>
      <p style="font-size:11px;color:#9B8AB8;margin-top:32px;line-height:1.6">
        ${escapeHtml(site.legalName)} · You're receiving this because you placed an order
        at duvcollections.com. This is a one-off notification, not a mailing list.</p>
    </div></body></html>`;

  try {
    const { error } = await resend.emails.send({
      from: `${site.name} <${site.contact.sales}>`,
      replyTo: site.contact.support,
      to: o.to,
      subject: `Your ${site.name} order has shipped — ${o.orderRef}`,
      html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

const escapeHtml = (s: string) =>
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
