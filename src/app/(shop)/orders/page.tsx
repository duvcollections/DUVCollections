import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { OrderLookup } from "./OrderLookup";
import { verifyOrderToken, nowMs } from "@/lib/order-token";
import { getOrder, toCustomerView, type CustomerOrderView } from "@/lib/orders-admin";
import { trackingUrl } from "@/lib/email";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Check the status and tracking of a DUV Collections order.",
  robots: { index: false, follow: false },
};

// A signed link resolves an order per request; nothing here may be cached.
export const dynamic = "force-dynamic";

/**
 * Resolve a `?t=` link from a confirmation or shipping email.
 *
 * Any failure — bad signature, expired, order gone — falls through to the
 * ordinary lookup form rather than showing an error. The customer came here to
 * find their parcel, and "your link expired" with no way forward is a support
 * email we'd rather not receive.
 */
async function fromToken(token: string | undefined): Promise<CustomerOrderView | null> {
  if (!token) return null;
  const sessionId = await verifyOrderToken(token, nowMs());
  if (!sessionId) return null;
  try {
    const order = await getOrder(sessionId);
    if (!order || order.status === "unpaid") return null;
    return toCustomerView(order, trackingUrl);
  } catch {
    return null;
  }
}

export default async function Orders({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const initial = await fromToken(t);
  const linkFailed = Boolean(t) && !initial;

  return (
    <>
      <PageHeader
        eyebrow="Your order"
        title="Track your order"
        lede={
          initial
            ? "Here's where your parcel is. This page updates itself — the link in your email always shows the latest."
            : "Enter your order reference and the email you checked out with. No account needed — we don't make you create one just to find out where your parcel is."
        }
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <Breadcrumbs trail={[{ href: "/", label: "Home" }, { label: "Track your order" }]} />

        {linkFailed && (
          <p className="mb-8 max-w-lg rounded-2xl border-2 border-duv-amber bg-tint-jewelry px-5 py-4 text-[14px] leading-relaxed text-duv-plum">
            That link has expired or isn&rsquo;t valid any more. Tracking links stop working after
            a few months on purpose, so an old email can&rsquo;t be used to look up an address.
            Enter your details below and you&rsquo;ll get straight to the same page.
          </p>
        )}

        <OrderLookup initial={initial} />

        <p className="mt-10 max-w-lg text-[13px] leading-relaxed text-duv-faint">
          We ask for both the reference and your email so nobody else can look up your address by
          guessing an order number. If you&rsquo;ve lost your confirmation email, write to{" "}
          {site.contact.support} from the address you ordered with and we&rsquo;ll find it.
        </p>
      </div>
    </>
  );
}
