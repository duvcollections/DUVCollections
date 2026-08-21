import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CartView } from "./CartView";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

/**
 * Static on purpose.
 *
 * Reading `searchParams` here would mark the whole route dynamic, and a dynamic
 * route is a full React render inside the Worker on every visit. The only thing
 * we needed from the query string was the "checkout cancelled" flag, which the
 * client component reads for itself — so the cart is now prerendered and served
 * from the asset cache.
 */
export default function CartPage() {
  return (
    <>
      <PageHeader
        eyebrow="Checkout"
        title="Your cart"
        lede="Shipping and any sales tax are shown before you pay. We never add a fee at the last step."
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <Breadcrumbs trail={[{ href: "/", label: "Home" }, { label: "Cart" }]} />
        {/* useSearchParams needs a boundary to prerender around — without it
            the whole route falls back to server rendering, which is the thing
            we were trying to avoid. */}
        <Suspense fallback={<p className="text-[15px] text-duv-muted">Loading your cart…</p>}>
          <CartView />
        </Suspense>
      </div>
    </>
  );
}
