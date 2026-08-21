import Script from "next/script";

/**
 * Plausible, loaded only when a domain is configured.
 *
 * Two deliberate choices:
 *
 * 1. The domain comes from an environment variable, so the script is simply
 *    absent until you subscribe. No dead request, no console error, and nothing
 *    to remove later.
 * 2. Plausible sets no cookies and stores no personal data, which is why there
 *    is no consent banner anywhere on this site. Swapping in Google Analytics
 *    would change that — GA needs one, and the absence of one becomes a
 *    compliance problem rather than a missing feature.
 *
 * `defer` plus `afterInteractive` keeps it off the critical path; the script is
 * about 1KB and does not touch our CPU budget in the Worker, because it runs in
 * the browser and is served from Plausible's own CDN.
 */
export function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;

  return (
    <Script
      defer
      strategy="afterInteractive"
      data-domain={domain}
      src="https://plausible.io/js/script.tagged-events.outbound-links.js"
    />
  );
}

/**
 * Report a conversion.
 *
 * Safe to call when analytics is switched off — `plausible` simply won't exist
 * and this becomes a no-op rather than a crash.
 */
export function trackEvent(name: string, props?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;
  const fn = (window as unknown as { plausible?: (n: string, o?: unknown) => void }).plausible;
  if (typeof fn === "function") fn(name, props ? { props } : undefined);
}
