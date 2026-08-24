import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /**
     * Hosts Next will optimise a remote image from.
     *
     * This is a security boundary, not a convenience list: without it any URL
     * saved in the admin could point the optimiser at an arbitrary server and
     * have our own domain serve the result. It mirrors the allowlist in
     * `src/lib/product-images.ts`, which validates URLs on the way in — both
     * ends are checked because either alone can be bypassed by the other path
     * (a direct database edit, or a future component that skips validation).
     */
    remotePatterns: [
      new URL("https://i.ebayimg.com/**"),
      new URL("https://ir.ebaystatic.com/**"),
      new URL("https://cdn.duvcollections.com/**"),
      new URL("https://duvcollections.com/**"),
    ],
  },
};

export default nextConfig;
