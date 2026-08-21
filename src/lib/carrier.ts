/**
 * Carrier detection from a tracking number.
 *
 * The point is not cleverness — it is that a mistyped carrier produces a
 * tracking link that goes nowhere, and the customer finds that out, not you.
 * Every carrier uses a recognisable number format, so the form can fill it in
 * and you only have to notice when it disagrees with you.
 */

export const CARRIERS = ["USPS", "UPS", "FedEx", "DHL"] as const;
export type Carrier = (typeof CARRIERS)[number];

/**
 * Best guess, or null when the number matches nothing or matches ambiguously.
 * Null means "ask the human" — never a coin flip.
 */
export function detectCarrier(tracking: string): Carrier | null {
  const t = tracking.replace(/[\s-]/g, "").toUpperCase();
  if (!t) return null;

  // UPS is the only unmistakable one: 1Z + 6 shipper + 2 service + 8 digits.
  if (/^1Z[0-9A-Z]{16}$/.test(t)) return "UPS";

  // USPS international / Express uses the UPU format: 2 letters, 9 digits, 2
  // letters. Ending in US is domestic USPS; other country codes are not ours.
  if (/^[A-Z]{2}\d{9}US$/.test(t)) return "USPS";

  if (/^\d+$/.test(t)) {
    // USPS IMpb numbers are 20–22 digits and start with a known service code.
    if ((t.length === 20 || t.length === 22) && /^(94|92|93|95|91|82)/.test(t)) return "USPS";
    if (t.length === 26) return "USPS";
    // FedEx Express is 12, Ground is 15, SmartPost is 20 or 22 — which collides
    // with USPS, so the prefix test above wins and anything left at 20/22 is
    // ambiguous rather than guessed.
    if (t.length === 12 || t.length === 15) return "FedEx";
    if (t.length === 20 || t.length === 22) return null;
    // DHL Express air waybills are 10 digits.
    if (t.length === 10) return "DHL";
    if (t.length === 11) return "DHL";
  }

  return null;
}

/** Whether a tracking number looks plausible at all, for form validation. */
export function looksLikeTracking(tracking: string): boolean {
  const t = tracking.replace(/[\s-]/g, "");
  return t.length >= 8 && t.length <= 40 && /^[0-9A-Za-z]+$/.test(t);
}
