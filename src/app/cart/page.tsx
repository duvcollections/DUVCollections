import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CartView } from "./CartView";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

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
        <CartView />
      </div>
    </>
  );
}
