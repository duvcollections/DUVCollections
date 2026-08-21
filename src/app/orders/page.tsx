import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { OrderLookup } from "./OrderLookup";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Check the status and tracking of a DUV Collections order.",
};

export default function Orders() {
  return (
    <>
      <PageHeader
        eyebrow="Your order"
        title="Track your order"
        lede="Enter your order reference and the email you checked out with. No account needed — we don't make you create one just to find out where your parcel is."
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <Breadcrumbs trail={[{ href: "/", label: "Home" }, { label: "Track your order" }]} />
        <OrderLookup />
        <p className="mt-10 max-w-lg text-[13px] leading-relaxed text-duv-faint">
          We ask for both the reference and your email so nobody else can look up your address by
          guessing an order number. If you&rsquo;ve lost your confirmation email, write to{" "}
          {site.contact.support} from the address you ordered with and we&rsquo;ll find it.
        </p>
      </div>
    </>
  );
}
