import Link from "next/link";
import { adminOrNull } from "@/lib/access";
import { listOrders, nowSeconds } from "@/lib/orders-admin";
import { allProducts } from "@/lib/catalog";
import { shippoConfigured, weightForOrder, suggestParcel } from "@/lib/shippo";
import { shippingStats, humanHours } from "@/lib/shipping-stats";
import { trackingUrl } from "@/lib/email";
import { money, site } from "@/lib/site";
import { ParcelsPerDay, CarrierSplit, StatTile } from "@/components/charts/ShippingCharts";
import { BuyLabel } from "./BuyLabel";
import { ImportTracking } from "./ImportTracking";

export const dynamic = "force-dynamic";

export default async function Shipping() {
  if (!(await adminOrNull())) return null;

  const [orders, products, connected] = await Promise.all([
    listOrders(60).catch(() => []),
    allProducts(),
    shippoConfigured(),
  ]);

  const s = shippingStats(orders, products, nowSeconds() * 1000);
  const overdue = s.problems.filter((p) => p.kind === "aging").length;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-[-0.025em]">Shipping</h1>
          <p className="mt-1.5 text-[14.5px] text-duv-muted">
            {connected
              ? "Live rates and labels through Shippo, with the CSV route to Pirate Ship still here as a fallback."
              : "Pirate Ship CSV round trip. Add SHIPPO_API_KEY to buy labels without leaving this page."}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-[12.5px] font-bold ${
            connected ? "bg-duv-mint/25 text-duv-green-ink" : "bg-duv-line text-duv-muted"
          }`}
          title={
            connected
              ? "SHIPPO_API_KEY is readable by this Worker version."
              : "This Worker version can't read SHIPPO_API_KEY. Adding a secret in the dashboard creates a new version that isn't promoted — push a commit to rebuild with it."
          }
        >
          {connected ? "Shippo connected" : "Shippo not connected"}
        </span>
      </div>

      {/* ------------------------------------------------------------ tiles */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Needs a label"
          value={String(s.waiting.length)}
          note={s.oldestWaitingHours !== null ? `Oldest waiting ${humanHours(s.oldestWaitingHours)}` : "Queue is clear"}
          tone={overdue > 0 ? "attention" : "plain"}
        />
        <StatTile
          label="In transit"
          value={String(s.inTransit.length)}
          note="Shipped and on its way"
        />
        <StatTile
          label="Needs attention"
          value={String(s.problems.length)}
          note={s.problems.length ? "Bad address, missing weight or overdue" : "Nothing flagged"}
          tone={s.problems.length ? "attention" : "good"}
        />
        <StatTile
          label="Shipped this month"
          value={String(s.shippedThisMonth)}
          note={s.medianHoursToShip !== null ? `Median ${humanHours(s.medianHoursToShip)} to dispatch` : "No history yet"}
        />
      </section>

      {/* ----------------------------------------------------------- charts */}
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <ParcelsPerDay days={s.parcelsPerDay} />
        <CarrierSplit carriers={s.carriers} />
      </section>

      {/* --------------------------------------------------------- problems */}
      {s.problems.length > 0 && (
        <section className="mt-6 rounded-2xl border-2 border-duv-amber bg-tint-jewelry p-6">
          <h2 className="font-display text-lg font-extrabold tracking-tight">Needs attention</h2>
          <p className="mt-1 text-[13px] text-duv-plum/70">
            These cost money if they sit — a wrong address becomes a returned parcel, and an
            overdue order becomes a support email.
          </p>
          <ul className="mt-4 divide-y divide-duv-plum/10">
            {s.problems.map((p, i) => (
              <li key={`${p.ref}-${p.kind}-${i}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 text-[13.5px]">
                <Link href={`/admin/orders/${p.id}`} className="font-mono font-bold text-duv-violet hover:text-duv-pink-ink">
                  {p.ref}
                </Link>
                <span className="text-duv-plum/80">{p.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ------------------------------------------------------------ queue */}
      <section className="mt-6">
        <h2 className="font-display text-xl font-extrabold tracking-tight">The queue</h2>
        <p className="mt-1 text-[13.5px] text-duv-muted">
          Oldest first — the order you should pack next is at the top.
        </p>

        {s.waiting.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-duv-line bg-white p-8 text-center text-[14.5px] text-duv-muted">
            Nothing waiting for a label. Every paid order has shipped.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {s.waiting.map((o) => {
              const oz = weightForOrder(o, products);
              const a = o.address;
              return (
                <li key={o.id} className="rounded-2xl border border-duv-line bg-white p-5">
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <Link href={`/admin/orders/${o.id}`} className="font-mono text-[14px] font-bold text-duv-violet hover:text-duv-pink-ink">
                      {o.ref}
                    </Link>
                    <span className="text-[14px] font-semibold">{o.name ?? o.email}</span>
                    {a && (
                      <span className="text-[13px] text-duv-muted">
                        {a.city}, {a.state} {a.postal_code}
                      </span>
                    )}
                    <span className="text-[13px] text-duv-faint-ink">
                      {o.items.reduce((n, i) => n + i.qty, 0)} item(s)
                      {oz !== null ? ` · ${oz} oz` : " · weight unknown"}
                    </span>
                    <span className="ml-auto font-display text-[15px] font-extrabold tabular-nums">
                      {money(o.total)}
                    </span>
                  </div>

                  <div className="mt-4">
                    <BuyLabel
                      id={o.id}
                      ref_={o.ref}
                      connected={connected}
                      suggestedWeightOz={oz}
                      suggestedPresetId={suggestParcel(oz ?? 16).id}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* -------------------------------------------------------- in transit */}
      {s.inTransit.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-extrabold tracking-tight">In transit</h2>
          <p className="mt-1 text-[13.5px] text-duv-muted">
            Delivery normally takes {site.policy.deliveryEstimate}.
          </p>
          <ul className="mt-4 divide-y divide-duv-line overflow-hidden rounded-2xl border border-duv-line bg-white">
            {s.inTransit.slice(0, 15).map((o) => {
              const url = o.carrier && o.tracking ? trackingUrl(o.carrier, o.tracking) : null;
              return (
                <li key={o.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3 text-[13.5px]">
                  <Link href={`/admin/orders/${o.id}`} className="font-mono font-bold text-duv-violet hover:text-duv-pink-ink">
                    {o.ref}
                  </Link>
                  <span>{o.name ?? o.email}</span>
                  <span className="text-duv-muted">{o.carrier}</span>
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="font-mono text-[12.5px] text-duv-violet underline underline-offset-2">
                      {o.tracking}
                    </a>
                  ) : (
                    <span className="font-mono text-[12.5px] text-duv-faint-ink">{o.tracking}</span>
                  )}
                  {/* Reprint without opening the order — the common case is a
                      label that jammed in the printer. */}
                  {o.labelUrl && (
                    <a
                      href={o.labelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto rounded-full border border-duv-line px-3 py-1 text-[12px] font-bold text-duv-muted hover:border-duv-violet hover:text-duv-violet"
                    >
                      Label PDF
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* --------------------------------------------------------------- csv */}
      <section className="mt-12">
        <h2 className="font-display text-xl font-extrabold tracking-tight">
          Or do it in bulk with Pirate Ship
        </h2>
        <p className="mt-1 max-w-[68ch] text-[13.5px] leading-relaxed text-duv-muted">
          Free at any volume, no per-label fee, no markup on postage. Export the queue, buy the
          labels there, paste the tracking export back.
        </p>

        <div className="mt-4 rounded-2xl border border-duv-line bg-white p-6">
          <h3 className="font-display text-[15px] font-extrabold tracking-tight">
            1. Send the addresses out
          </h3>
          <p className="mt-1.5 max-w-[64ch] text-[13px] leading-relaxed text-duv-muted">
            Weights come from the SKUs on each order plus an ounce for packaging. Where a SKU
            isn&rsquo;t in the catalogue the weight is left blank rather than guessed.
          </p>
          <a
            href="/api/admin/ship-csv"
            className="mt-4 inline-block rounded-full bg-duv-pink-deep px-6 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-duv-coral-deep"
          >
            Download {s.waiting.length} unshipped order(s)
          </a>
        </div>

        <div className="mt-4">
          <ImportTracking />
        </div>
      </section>
    </>
  );
}
