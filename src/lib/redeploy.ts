import { secret } from "@/lib/stripe";

/**
 * Ask Cloudflare to rebuild the site after a catalogue change.
 *
 * The shop's product pages are prerendered, which is what keeps them cheap
 * enough to serve inside the free CPU budget. The cost of that is staleness:
 * saving a price in the admin changes D1, but the page a customer sees was
 * built earlier and won't know. This closes that gap by triggering a build.
 *
 * A deploy hook is a URL that starts a build and nothing else — it can't read
 * anything and it can't deploy arbitrary code, which is why it's safe to hold
 * as a secret the app can use on its own.
 *
 * Deliberately fire-and-forget and never fatal: a save that succeeded must not
 * report failure because a rebuild couldn't be queued. The worst case is the
 * shop lagging until the next push, which is exactly where we were before.
 */
export type RedeployResult =
  | { queued: true }
  | { queued: false; reason: string };

export async function requestRedeploy(): Promise<RedeployResult> {
  let hook: string;
  try {
    hook = (await secret("CF_DEPLOY_HOOK_URL")).trim();
  } catch {
    return { queued: false, reason: "No deploy hook configured." };
  }
  if (!hook) return { queued: false, reason: "No deploy hook configured." };

  // Only ever POST to Cloudflare's own hook host. If this secret is ever set to
  // something else — by mistake or otherwise — this refuses rather than turning
  // the admin into a request generator pointed at an arbitrary URL.
  let host: string;
  try {
    host = new URL(hook).host;
  } catch {
    return { queued: false, reason: "The deploy hook isn't a valid URL." };
  }
  if (!host.endsWith(".cloudflare.com")) {
    return { queued: false, reason: `Refusing to call ${host} — a deploy hook must be a Cloudflare URL.` };
  }

  try {
    const res = await fetch(hook, { method: "POST" });
    if (!res.ok) return { queued: false, reason: `Cloudflare replied ${res.status}.` };
    return { queued: true };
  } catch (err) {
    return { queued: false, reason: (err as Error).message };
  }
}
