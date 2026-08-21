import { createRemoteJWKSet, jwtVerify } from "jose";
import { headers } from "next/headers";
import { cache } from "react";
import { secret } from "@/lib/stripe";

/**
 * Cloudflare Access verification for /admin.
 *
 * Access puts a login in front of the route at Cloudflare's edge, and forwards a
 * signed JWT in `Cf-Access-Jwt-Assertion`. We verify that signature here rather
 * than trusting the convenience header — because a plain header can be forged by
 * anyone who reaches the Worker by another route (a *.workers.dev URL, say).
 * Signature verification is what makes the guard real.
 */

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

export type AdminIdentity = { email: string };

/**
 * Verify once per request, not once per component.
 *
 * The layout guards the page, and each page guards itself — which meant the
 * same RSA signature was being verified three times for a single dashboard
 * load. React's `cache` memoises for the lifetime of one request, so the layout
 * and the page share a single verification. On a platform billed by CPU
 * milliseconds that is not a micro-optimisation.
 */
export const requireAdmin = cache(verifyAdmin);

async function verifyAdmin(): Promise<AdminIdentity> {
  const h = await headers();
  const token = h.get("cf-access-jwt-assertion");

  if (!token) {
    throw new AccessError(
      "No Cloudflare Access token on this request. If you reached this page " +
        "without signing in, the Access policy isn't covering this route.",
    );
  }

  const teamDomain = await secret("CF_ACCESS_TEAM_DOMAIN"); // e.g. duvcollections.cloudflareaccess.com
  const aud = await secret("CF_ACCESS_AUD");

  jwks ??= createRemoteJWKSet(
    new URL(`https://${teamDomain}/cdn-cgi/access/certs`),
  );

  let payload;
  try {
    ({ payload } = await jwtVerify(token, jwks, {
      issuer: `https://${teamDomain}`,
      audience: aud,
    }));
  } catch (err) {
    throw new AccessError(`Access token failed verification: ${(err as Error).message}`);
  }

  const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
  if (!email) throw new AccessError("Access token carried no email claim.");

  // Second gate: even a valid Access token only gets in if the address is listed.
  // Access policies can be widened by accident; this cannot.
  const allowed = (await secret("ADMIN_EMAILS"))
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!allowed.includes(email)) {
    throw new AccessError(`${email} is not on the admin allowlist.`);
  }

  return { email };
}

export class AccessError extends Error {}

/**
 * Non-throwing guard for admin *pages*.
 *
 * The layout already renders the "Not signed in" notice, so a page only needs
 * to know whether to do any work at all. Without this, an unauthenticated GET
 * to /admin/orders still runs the Stripe query — the output is discarded, but
 * the API call (and its cost, and its rate limit) is real. Returning early
 * means an unauthorised request touches nothing.
 */
export async function isAdmin(): Promise<boolean> {
  return (await adminOrNull()) !== null;
}

/** Same guard, but hands back the identity so callers don't verify twice. */
export async function adminOrNull(): Promise<AdminIdentity | null> {
  try {
    return await requireAdmin();
  } catch {
    return null;
  }
}
