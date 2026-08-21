import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder } from "@/lib/orders-admin";
import { trackingUrl } from "@/lib/email";
import { money, site } from "@/lib/site";
import { ShipForm } from "./ShipForm";
import { RefundForm } from "./RefundForm";
import { isAdmin } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  // Defence in depth: the layout renders the sign-in notice, but without this
  // an unauthorised request would still run the queries below.
  if (!(await isAdmin())) return null;
  const { id } = await params;
  const o = await getOrder(id);
  if (!o) notFound();

  const url = o.carrier && o.tracking ? trackingUrl(o.carrier, o.tracking) : null;
  const a = o.address;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/admin/orders" className="text-[13.5px] font-semibold text-duv-violet hover:text-duv-pink-ink">
          ← All orders
        </Link>
        <Link
          href={`/admin/orders/${o.id}/packing-slip`}
          className="rounded-full border border-duv-line px-4 py-2 text-[13px] font-bold text-duv-muted hover:border-duv-violet hover:text-duv-violet"
        >
          Packing slip
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.025em]">
          <span className="font-mono">{o.ref}</span>
        </h1>
        <span
          className={`rounded-full px-3 py-1 text-[12.5px] font-bold ${
            o.status === "refunded"
              ? "bg-duv-line text-duv-muted"
              : o.status === "shipped"
                ? "bg-duv-mint/25 text-duv-green-ink"
                : "bg-duv-pink/12 text-duv-pink-ink"
          }`}
        >
          {o.status === "refunded"
            ? "Refunded"
            : o.status === "shipped"
              ? "Shipped"
              : "Awaiting dispatch"}
        </span>
        {o.refundedAmount > 0 && (
          <span className="text-[13px] font-semibold text-duv-muted">
            {money(o.refundedAmount)} refunded
          </span>
        )}
        <span className="text-[13.5px] text-duv-muted">
          {new Date(o.created * 1000).toLocaleString("en-US", {
            dateStyle: "medium", timeStyle: "short",
          })}
        </span>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        <div className="space-y-6">
          {/* ---- packing list ---- */}
          <div className="rounded-2xl border border-duv-line bg-white p-6">
            <h2 className="font-display text-lg font-extrabold tracking-tight">Pack this</h2>
            <ul className="mt-4 divide-y divide-duv-line">
              {o.items.map((i, n) => (
                <li key={n} className="flex items-baseline justify-between gap-4 py-3">
                  <span className="text-[14.5px] font-semibold">{i.title}</span>
                  <span className="shrink-0 font-mono text-[14px] font-bold">×{i.qty}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-5 space-y-2 border-t border-duv-line pt-4 text-[14px]">
              <div className="flex justify-between"><dt className="text-duv-muted">Subtotal</dt><dd className="tabular-nums">{money(o.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-duv-muted">Shipping</dt><dd className="tabular-nums">{o.shipping === 0 ? "Free" : money(o.shipping)}</dd></div>
              <div className="flex justify-between"><dt className="text-duv-muted">Tax</dt><dd className="tabular-nums">{money(o.tax)}</dd></div>
              <div className="flex justify-between border-t border-duv-line pt-2.5 text-[16px] font-bold">
                <dt>Total paid</dt><dd className="font-display tabular-nums">{money(o.total)}</dd>
              </div>
            </dl>
          </div>

          <ShipForm id={o.id} carrier={o.carrier} tracking={o.tracking} customerEmail={o.email} />
        </div>

        <div className="space-y-6">
          {/* ---- ship to ---- */}
          <div className="rounded-2xl border border-duv-line bg-white p-6">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-duv-faint-ink">Ship to</h2>
            <address className="mt-3 text-[14.5px] not-italic leading-relaxed">
              <strong className="block">{o.name ?? "—"}</strong>
              {a ? (
                <>
                  {a.line1}
                  {a.line2 && <><br />{a.line2}</>}
                  <br />
                  {a.city}, {a.state} {a.postal_code}
                  <br />
                  {a.country}
                </>
              ) : (
                <span className="text-duv-muted">No address collected</span>
              )}
            </address>
            <div className="mt-4 space-y-1 border-t border-duv-line pt-3 text-[13.5px]">
              {o.email && <a className="block text-duv-violet hover:text-duv-pink-ink" href={`mailto:${o.email}`}>{o.email}</a>}
              {o.phone && <a className="block text-duv-violet hover:text-duv-pink-ink" href={`tel:${o.phone}`}>{o.phone}</a>}
            </div>
          </div>

          {o.tracking && (
            <div className="rounded-2xl border border-duv-line bg-white p-6">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-duv-faint-ink">Tracking</h2>
              <p className="mt-2 text-[13px] text-duv-muted">{o.carrier}</p>
              <p className="mt-1 break-all font-mono text-[15px] font-bold">{o.tracking}</p>
              {url && (
                <a href={url} target="_blank" rel="noopener noreferrer"
                   className="mt-3 inline-block text-[13.5px] font-bold text-duv-violet underline underline-offset-4">
                  Open carrier tracking ↗
                </a>
              )}
              {o.shippedAt && (
                <p className="mt-3 text-[12.5px] text-duv-faint-ink">
                  Marked shipped {new Date(o.shippedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-duv-line bg-white p-6">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-duv-faint-ink">In Stripe</h2>
            <p className="mt-2 break-all font-mono text-[12px] text-duv-muted">{o.id}</p>
            <p className="mt-3 text-[13px] leading-relaxed text-duv-muted">
              Refunds are issued from the Stripe dashboard, not here — that keeps the money
              controls in one place, behind Stripe&rsquo;s own permissions.
            </p>
            {o.paymentIntentId && (
              <a
                href={`https://dashboard.stripe.com/payments/${o.paymentIntentId}`}
                target="_blank" rel="noopener noreferrer"
                className="mt-3 inline-block text-[13.5px] font-bold text-duv-violet underline underline-offset-4"
              >
                Open in Stripe ↗
              </a>
            )}
          </div>

          <p className="px-2 text-[12.5px] leading-relaxed text-duv-faint-ink">
            Customers can look this order up themselves at {site.url}/orders using the reference
            and their email.
          </p>
        </div>
      </div>
      <section className="mt-10 border-t border-duv-line pt-8">
        <RefundForm id={o.id} ref_={o.ref} total={o.total} hasStock={o.skus.length > 0} />
      </section>
    </>
  );
}
