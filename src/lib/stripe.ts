import Stripe from "stripe";

/**
 * Stripe client for the Cloudflare Workers runtime.
 *
 * Workers has no Node http module, so the SDK must be told to use `fetch`.
 * Built per-request rather than at module scope because env bindings are only
 * available inside a request on Workers.
 */
export function stripeClient(secretKey: string) {
  return new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 2,
  });
}

export const cryptoProvider = () => Stripe.createSubtleCryptoProvider();

/**
 * Reads a secret from the Cloudflare environment.
 *
 * Secrets live in the Cloudflare dashboard under Settings → Variables and
 * Secrets — never in this repo, never in a commit. `.dev.vars` supplies them
 * for local development and is git-ignored.
 *
 * Falls back to process.env so `next dev` works with a local .env.local too.
 */
export async function secret(name: string): Promise<string> {
  let value: string | undefined;

  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    value = (ctx.env as unknown as Record<string, string | undefined>)[name];
  } catch {
    // Not running on Workers (plain `next dev`) — fall through.
  }

  value ??= process.env[name];

  if (!value) {
    throw new Error(
      `Missing ${name}. Add it in Cloudflare → Compute (Workers) → duvcollections → ` +
        `Settings → Variables and Secrets, or to .dev.vars for local development.`,
    );
  }
  return value;
}
