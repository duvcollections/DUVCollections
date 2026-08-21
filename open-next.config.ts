import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

/**
 * Serve prerendered pages from Workers static assets, and short-circuit the
 * router before Next boots.
 *
 * Without an incremental cache configured, OpenNext ships no prerendered output
 * at all: every request — including the home page — re-renders React inside the
 * Worker. That is what pushed median CPU to 15.6 ms against the free plan's
 * 10 ms ceiling and started returning Error 1102 to real customers.
 *
 * `staticAssetsIncrementalCache` writes the prerendered pages into the asset
 * bundle at build time, and `enableCacheInterception` lets the Worker answer
 * from that cache without loading the page's JavaScript at all.
 *
 * The trade-off is deliberate: this cache is read-only, so there is no
 * on-demand revalidation. Prerendered pages change when you deploy, which is
 * exactly how this site already works — it rebuilds on every push to main.
 */
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
