import { secret } from "@/lib/stripe";

/**
 * Signed one-click tracking links.
 *
 * The confirmation and shipping emails carry a link that opens the order
 * directly, so the customer never types a reference. That link is a capability:
 * whoever holds it sees the order. Three things keep that safe.
 *
 *  1. **It is signed.** The link carries the full Stripe session id, but the
 *     signature is what the server checks. Nobody can mint a link for an order
 *     they don't already know, and nobody can take the 12-character reference
 *     shown on the receipt and extend it into a working link.
 *  2. **It expires.** 120 days, which comfortably outlives any delivery and any
 *     return window, then stops working. An old email in a shared inbox is not
 *     a permanent key to someone's address.
 *  3. **It shows less than the admin does.** The page it opens carries no phone
 *     number and no street address — only the city and state the buyer already
 *     knows, so a forwarded email leaks nothing they didn't already have.
 *
 * The signing key is derived from STRIPE_SECRET_KEY rather than being a fourth
 * secret to set up and lose. Rotating the Stripe key therefore invalidates every
 * outstanding link — which is the correct behaviour, not a bug: if that key ever
 * leaks, the links minted under it should die with it.
 */

const TTL_DAYS = 120;

let keyPromise: Promise<CryptoKey> | null = null;

async function signingKey(): Promise<CryptoKey> {
  // Derived, never used raw: the Stripe key is hashed first so the MAC key and
  // the API credential are not literally the same bytes.
  keyPromise ??= (async () => {
    const material = new TextEncoder().encode(
      `duv:order-link:v1:${await secret("STRIPE_SECRET_KEY")}`,
    );
    const digest = await crypto.subtle.digest("SHA-256", material);
    return crypto.subtle.importKey("raw", digest, { name: "HMAC", hash: "SHA-256" }, false, [
      "sign",
    ]);
  })();
  return keyPromise;
}

const b64url = (bytes: ArrayBuffer | Uint8Array): string => {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of view) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const unb64url = (s: string): Uint8Array => {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

async function mac(payload: string): Promise<string> {
  const sig = await crypto.subtle.sign(
    "HMAC",
    await signingKey(),
    new TextEncoder().encode(payload),
  );
  return b64url(sig);
}

/** Mint a tracking link token for a Stripe checkout session id. */
export async function signOrderToken(sessionId: string, nowMs: number): Promise<string> {
  const exp = Math.floor(nowMs / 1000) + TTL_DAYS * 86400;
  const payload = `${sessionId}|${exp}`;
  const encoded = b64url(new TextEncoder().encode(payload));
  return `${encoded}.${await mac(payload)}`;
}

/**
 * Full tracking URL to drop into an email.
 *
 * Degrades rather than throws. Signing needs a secret, and if that secret is
 * missing the right outcome is an email carrying a plain link to the lookup
 * page — not an exception thrown from inside a mail send, which would take down
 * the request that was marking an order as shipped.
 */
export async function orderTrackingLink(
  baseUrl: string,
  sessionId: string,
  nowMs: number,
): Promise<string> {
  try {
    const token = await signOrderToken(sessionId, nowMs);
    return `${baseUrl}/orders?t=${encodeURIComponent(token)}`;
  } catch (err) {
    console.error("[order-token] could not sign tracking link:", (err as Error).message);
    return `${baseUrl}/orders`;
  }
}

/**
 * Verify a token and return the session id, or null.
 *
 * Returns null for every failure mode — bad signature, expired, malformed —
 * with no hint about which. A caller that distinguished them would be telling
 * an attacker whether a session id was real.
 */
export async function verifyOrderToken(
  token: string,
  nowMs: number,
): Promise<string | null> {
  try {
    const [encoded, given] = token.split(".");
    if (!encoded || !given) return null;

    const payload = new TextDecoder().decode(unb64url(encoded));
    const expected = await mac(payload);
    if (!timingSafeEqual(expected, given)) return null;

    const sep = payload.lastIndexOf("|");
    if (sep < 1) return null;
    const sessionId = payload.slice(0, sep);
    const exp = Number(payload.slice(sep + 1));
    if (!Number.isFinite(exp) || exp * 1000 < nowMs) return null;
    if (!sessionId.startsWith("cs_")) return null;

    return sessionId;
  } catch {
    return null;
  }
}

/** Constant-time string compare, so failures don't leak how much matched. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Wall-clock milliseconds.
 *
 * Wrapped so callers in server components read the time through a function
 * rather than calling an impure builtin during render. These pages are
 * `force-dynamic`, so this is evaluated once per request.
 */
export function nowMs(): number {
  return Date.now();
}
