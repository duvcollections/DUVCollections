import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/access";
import { getOrder } from "@/lib/orders-admin";
import { site } from "@/lib/site";
import { PrintButton } from "./PrintButton";

export const metadata = { title: "Packing slip", robots: { index: false, follow: false } };

/**
 * A packing slip, not an invoice.
 *
 * Deliberately carries no prices. This sheet goes in the box, and a customer
 * who bought a gift does not want the recipient reading what it cost — this is
 * the single most common complaint about shops that print the invoice instead.
 * The customer already has their receipt by email.
 *
 * Printing is done by the browser rather than a PDF library: no dependency, no
 * CPU spent rendering a document in the Worker, and the result is identical.
 */
export default async function PackingSlipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdmin())) return null;

  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const a = order.address;

  return (
    <>
      {/* Screen-only controls. `print:hidden` keeps them off the paper. */}
      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <PrintButton />
        <Link
          href={`/admin/orders/${order.id}`}
          className="text-[14px] font-bold text-duv-violet underline underline-offset-4"
        >
          Back to the order
        </Link>
        <p className="text-[13px] text-duv-muted">
          No prices are printed — this sheet goes in the box.
        </p>
      </div>

      <article className="mx-auto max-w-[7.5in] bg-white p-10 text-duv-plum print:max-w-none print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-duv-plum pb-6">
          <div>
            <p className="font-display text-2xl font-extrabold tracking-[-0.02em]">{site.name}</p>
            <p className="mt-1 text-[13px] text-duv-muted">{site.legalName}</p>
            <p className="mt-0.5 text-[13px] text-duv-muted">{site.contact.support}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-duv-faint-ink">
              Packing slip
            </p>
            <p className="mt-1 font-mono text-lg font-bold">{order.ref}</p>
            <p className="mt-0.5 text-[13px] text-duv-muted">
              {/* Stripe gives seconds; JS wants milliseconds. */}
              {new Date(order.created * 1000).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </header>

        <section className="mt-8">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-duv-faint-ink">
            Ship to
          </h2>
          <address className="mt-2 text-[15px] not-italic leading-relaxed">
            {order.name && <span className="block font-semibold">{order.name}</span>}
            {a ? (
              <>
                {a.line1 && <span className="block">{a.line1}</span>}
                {a.line2 && <span className="block">{a.line2}</span>}
                <span className="block">
                  {[a.city, a.state, a.postal_code].filter(Boolean).join(", ")}
                </span>
                {a.country && <span className="block">{a.country}</span>}
              </>
            ) : (
              <span className="block text-duv-muted">No shipping address on this order.</span>
            )}
          </address>
        </section>

        <section className="mt-8">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-duv-faint-ink">
            Items
          </h2>
          <table className="mt-2 w-full border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-duv-line text-left">
                <th scope="col" className="py-2 font-bold">Item</th>
                <th scope="col" className="w-24 py-2 text-right font-bold">Qty</th>
                <th scope="col" className="w-28 py-2 text-right font-bold">Packed</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it, i) => (
                <tr key={i} className="border-b border-duv-line">
                  <td className="py-3 pr-4">{it.title}</td>
                  <td className="py-3 text-right font-semibold tabular-nums">{it.qty}</td>
                  {/* A box to tick while packing — the reason this is on paper. */}
                  <td className="py-3 text-right">
                    <span className="ml-auto inline-block h-4 w-4 border border-duv-plum" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[13px] text-duv-muted">
            {order.items.reduce((n, i) => n + i.qty, 0)} item
            {order.items.reduce((n, i) => n + i.qty, 0) === 1 ? "" : "s"} in this order.
          </p>
        </section>

        <footer className="mt-10 border-t border-duv-line pt-6 text-[13px] leading-relaxed text-duv-muted">
          <p className="font-semibold text-duv-plum">Thank you for your order.</p>
          <p className="mt-1">
            Something not right? Email {site.contact.support} quoting {order.ref}. You have{" "}
            {site.policy.returnWindowDays} days from delivery to start a return.
          </p>
          <p className="mt-3 text-[12px] text-duv-faint-ink">
            Track your parcel at {site.url.replace("https://", "")}/orders
          </p>
        </footer>
      </article>
    </>
  );
}
