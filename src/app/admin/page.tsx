import Link from "next/link";
import { listOrders, nowSeconds } from "@/lib/orders-admin";
import { allProducts } from "@/lib/catalog";
import { dbAvailable } from "@/lib/db";
import { money } from "@/lib/site";
import { adminOrNull } from "@/lib/access";
import { dashboardStats, type TopProduct } from "@/lib/dashboard-stats";
import {
  StatCard,
  RevenueTrend,
  OrdersPerDay,
  MoneySplit,
} from "@/components/charts/DashboardCharts";
import { TestEmailButton } from "./TestEmailButton";

export const dynamic = "force-dynamic";

const WINDOWS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
] as const;

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  // Defence in depth: the layout renders the sign-in notice, but without this
  // an unauthorised request would still run the queries below.
  const admin = await adminOrNull();
  if (!admin) return null;

  const { w } = await searchParams;
  const windowDays = WINDOWS.find((x) => String(x.days) === w)?.days ?? 30;

  const [orders, products, hasDb] = await Promise.all([
    // Enough history for the 90-day view plus its comparison window.
    listOrders(200).catch(() => []),
    allProducts(),
    dbAvailable(),
  ]);

  const now = nowSeconds();
  const s = dashboardStats(orders, products, now, windowDays);
  const recent = orders.filter((o) => o.status !== "unpaid").slice(0, 6);
  const needsPacking = orders.filter((o) => o.status === "paid");

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-[-0.025em]">Dashboard</h1>
          <p className="mt-1.5 text-[14px] text-duv-muted">
            Signed in as {admin.email} · last {windowDays} days
          </p>
        </div>

        {/* Plain links, not a client component: the page is already dynamic and
            a router round-trip costs less than shipping JS to swap a number. */}
        <nav aria-label="Reporting period" className="flex gap-1 rounded-full border border-duv-line bg-white p-1">
          {WINDOWS.map((x) => {
            const active = x.days === windowDays;
            return (
              <Link
                key={x.days}
                href={`/admin?w=${x.days}`}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors ${
                  active
                    ? "bg-duv-plum text-white"
                    : "text-duv-muted hover:bg-duv-shell hover:text-duv-plum"
                }`}
              >
                {x.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {!hasDb && (
        <p className="mt-5 rounded-2xl border-2 border-duv-amber bg-tint-jewelry p-5 text-[14px] leading-relaxed text-duv-plum">
          <strong>No database bound.</strong> Products are being read from the bundled seed file,
          and edits won&rsquo;t save. Create the D1 database and add the <code>DB</code> binding,
          then run the migration.
        </p>
      )}

      {/* ---- headline numbers ---- */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue"
          value={money(s.revenue)}
          trend={s.revenueTrend}
          note={`vs previous ${windowDays} days`}
          accent={0}
        />
        <StatCard
          label="Orders"
          value={String(s.orderCount)}
          trend={s.orderTrend}
          note={`${s.unitsSold} items sold`}
          accent={1}
        />
        <StatCard
          label="Average order"
          value={money(s.averageOrder)}
          note={s.orderCount ? `across ${s.orderCount} orders` : "no orders yet"}
          accent={2}
        />
        <StatCard
          label="Awaiting dispatch"
          value={String(s.unshipped)}
          note={
            s.oldestUnshippedHours === null
              ? "nothing waiting"
              : `oldest ${Math.round(s.oldestUnshippedHours)}h`
          }
          accent={3}
        />
      </div>

      {/* ---- charts ---- */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <RevenueTrend series={s.series} />
        <MoneySplit split={s.split} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <OrdersPerDay series={s.series} />

        {/* ---- best sellers ---- */}
        <section className="overflow-hidden rounded-2xl border border-duv-line bg-white">
          <div className="flex items-center justify-between border-b border-duv-line px-6 py-4">
            <h2 className="font-display text-[15px] font-extrabold tracking-tight">Best sellers</h2>
            <Link
              href="/admin/products"
              className="text-[13px] font-bold text-duv-violet underline underline-offset-4"
            >
              All products
            </Link>
          </div>

          {s.topProducts.length === 0 ? (
            <p className="px-6 py-10 text-center text-[14px] text-duv-muted">
              No sales in this period yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13.5px]">
                <thead>
                  <tr className="border-b border-duv-line text-left text-[11px] uppercase tracking-[0.12em] text-duv-faint-ink">
                    <th scope="col" className="px-6 py-2.5 font-bold">Product</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-bold">Units</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-bold">Revenue</th>
                    <th scope="col" className="px-6 py-2.5 text-right font-bold">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-duv-line">
                  {s.topProducts.map((p) => (
                    <tr key={p.title}>
                      <td className="px-6 py-3">
                        <span className="block font-semibold text-duv-plum">{p.title}</span>
                        <span className="block font-mono text-[11.5px] text-duv-faint-ink">{p.sku}</span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-duv-muted">{p.units}</td>
                      <td className="px-3 py-3 text-right font-display font-extrabold tabular-nums">
                        {money(p.revenue)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <StockBadge p={p} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* ---- work queues ---- */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-duv-line bg-white">
          <div className="flex items-center justify-between border-b border-duv-line px-6 py-4">
            <h2 className="font-display text-[15px] font-extrabold tracking-tight">Needs packing</h2>
            <Link href="/admin/orders" className="text-[13px] font-bold text-duv-violet underline underline-offset-4">
              All orders
            </Link>
          </div>
          {needsPacking.length === 0 ? (
            <p className="px-6 py-10 text-center text-[14px] text-duv-muted">
              Nothing waiting. Every paid order has shipped.
            </p>
          ) : (
            <ul className="divide-y divide-duv-line">
              {needsPacking.slice(0, 6).map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3.5 hover:bg-duv-shell"
                  >
                    <span className="font-mono text-[12.5px] font-bold">{o.ref}</span>
                    <span className="text-[13.5px]">{o.name ?? o.email}</span>
                    <span className="text-[12.5px] text-duv-faint-ink">
                      {Math.round((now - o.created) / 3600)}h ago
                    </span>
                    <span className="ml-auto font-display text-[14px] font-extrabold tabular-nums">
                      {money(o.total)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-duv-line bg-white">
          <div className="flex items-center justify-between border-b border-duv-line px-6 py-4">
            <h2 className="font-display text-[15px] font-extrabold tracking-tight">Recent orders</h2>
            <Link href="/admin/sales" className="text-[13px] font-bold text-duv-violet underline underline-offset-4">
              Sales
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="px-6 py-10 text-center text-[14px] text-duv-muted">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-duv-line">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3.5 hover:bg-duv-shell"
                  >
                    <span className="font-mono text-[12.5px] font-bold">{o.ref}</span>
                    <span className="text-[13.5px]">{o.name ?? o.email}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11.5px] font-bold ${
                        o.status === "shipped"
                          ? "bg-duv-mint/25 text-duv-green-ink"
                          : "bg-duv-pink/12 text-duv-pink-ink"
                      }`}
                    >
                      {o.status === "shipped" ? "Shipped" : "Paid"}
                    </span>
                    <span className="ml-auto font-display text-[14px] font-extrabold tabular-nums">
                      {money(o.total)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ---- stock attention ---- */}
      {(s.lowStock > 0 || s.outOfStock > 0) && (
        <section className="mt-4 rounded-2xl border border-duv-line bg-white p-6">
          <h2 className="font-display text-[15px] font-extrabold tracking-tight">Stock needs attention</h2>
          <p className="mt-2 text-[13.5px] text-duv-muted">
            {s.outOfStock > 0 && (
              <>
                <strong className="text-duv-plum">{s.outOfStock}</strong> out of stock
                {s.lowStock > 0 && " · "}
              </>
            )}
            {s.lowStock > 0 && (
              <>
                <strong className="text-duv-plum">{s.lowStock}</strong> running low
              </>
            )}
            .{" "}
            <Link href="/admin/products" className="font-bold text-duv-violet underline underline-offset-4">
              Review products
            </Link>
          </p>
        </section>
      )}

      <section className="mt-10">
        <TestEmailButton to={admin.email} />
      </section>
    </>
  );
}

/** Status is never colour alone — the word carries the meaning. */
function StockBadge({ p }: { p: TopProduct }) {
  if (p.status === "out-of-stock") {
    return (
      <span className="rounded-full bg-duv-coral/15 px-2.5 py-1 text-[11.5px] font-bold text-duv-coral">
        Out of stock
      </span>
    );
  }
  if (p.status === "low-stock") {
    return (
      <span className="rounded-full bg-duv-amber/25 px-2.5 py-1 text-[11.5px] font-bold text-duv-plum">
        Low · {p.stock}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-duv-mint/25 px-2.5 py-1 text-[11.5px] font-bold text-duv-green-ink">
      {p.stock === null ? "Not tracked" : `${p.stock} left`}
    </span>
  );
}
