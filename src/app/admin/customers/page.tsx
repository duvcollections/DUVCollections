import Link from "next/link";
import { isAdmin } from "@/lib/access";
import { listOrders, nowSeconds } from "@/lib/orders-admin";
import { allProducts } from "@/lib/catalog";
import { customerStats, orderProfit, profitSummary, daysAgo } from "@/lib/customer-stats";
import { money } from "@/lib/site";
import { StatCard } from "@/components/charts/DashboardCharts";

export const metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  if (!(await isAdmin())) return null;

  const [orders, products] = await Promise.all([
    listOrders(200).catch(() => []),
    allProducts(),
  ]);

  const stats = customerStats(orders);
  const profits = orders
    .filter((o) => o.status !== "unpaid")
    .map((o) => orderProfit(o, products, o.labelCost));
  const profit = profitSummary(profits);

  // nowSeconds() is the wrapped clock read — see orders-admin. Calling
  // Date.now() directly in a component body is impure and flagged as such.
  const now = nowSeconds();
  const nowMs = now * 1000;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em]">Customers</h1>
        <p className="mt-2 max-w-[70ch] text-[14.5px] leading-relaxed text-duv-muted">
          Who buys more than once, what they are worth over time, and what each order actually
          earned after goods, postage and card fees.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Customers"
          value={String(stats.total)}
          note={`${stats.repeat} came back`}
          accent={0}
        />
        <StatCard
          label="Repeat rate"
          value={stats.total ? `${(stats.repeatRate * 100).toFixed(0)}%` : "—"}
          note={
            stats.medianDaysBetween === null
              ? "no repeat orders yet"
              : `typically ${Math.round(stats.medianDaysBetween)} days apart`
          }
          accent={1}
        />
        <StatCard
          label="Lifetime value"
          value={money(stats.lifetimeValue)}
          note="average per customer"
          accent={2}
        />
        <StatCard
          label="Average order"
          value={money(stats.averageOrder)}
          note={`across ${orders.length} orders`}
          accent={3}
        />
      </div>

      {/* ---- profit ---- */}
      <section className="rounded-3xl border border-duv-line bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-[17px] font-extrabold tracking-tight">Profit</h2>
          <span className="text-[13px] text-duv-muted">
            {profit.complete} of {profit.orders.length} orders fully costed
          </span>
        </div>

        {profit.complete === 0 ? (
          <p className="mt-4 rounded-2xl bg-duv-shell px-5 py-4 text-[13.5px] leading-relaxed text-duv-muted">
            No order has enough information to compute profit yet. Each one needs a cost price on
            every product it contains, and a purchased shipping label. Add cost prices on the{" "}
            <Link href="/admin/products" className="font-bold text-duv-violet underline underline-offset-2">
              products page
            </Link>
            {" "}and the figures appear here.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="font-display text-[26px] font-extrabold tabular-nums">
                {money(profit.profit)}
              </p>
              <p className="mt-1 text-[13px] text-duv-muted">
                profit on {profit.complete} costed order{profit.complete === 1 ? "" : "s"}
              </p>
            </div>
            <div>
              <p className="font-display text-[26px] font-extrabold tabular-nums">
                {profit.margin === null ? "—" : `${(profit.margin * 100).toFixed(1)}%`}
              </p>
              <p className="mt-1 text-[13px] text-duv-muted">margin after goods, postage, fees</p>
            </div>
            <div>
              <p className="font-display text-[26px] font-extrabold tabular-nums">
                {money(profit.revenue)}
              </p>
              <p className="mt-1 text-[13px] text-duv-muted">revenue, all orders</p>
            </div>
          </div>
        )}

        {profit.needCost.length > 0 && (
          <div className="mt-5 rounded-2xl bg-tint-jewelry px-5 py-4">
            <p className="text-[13px] font-bold text-duv-plum">
              {profit.needCost.length} product{profit.needCost.length === 1 ? "" : "s"} need a cost
              price before profit can be worked out
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {profit.needCost.slice(0, 12).map((n) => (
                <li key={n.sku} className="text-[12.5px] text-duv-plum/75">
                  <Link
                    href={`/admin/products/${encodeURIComponent(n.sku)}`}
                    className="font-mono font-bold underline underline-offset-2"
                  >
                    {n.sku}
                  </Link>{" "}
                  · {n.orders} order{n.orders === 1 ? "" : "s"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ---- best customers ---- */}
      <section className="overflow-hidden rounded-3xl border border-duv-line bg-white">
        <h2 className="border-b border-duv-line px-6 py-4 font-display text-[17px] font-extrabold tracking-tight">
          Best customers
        </h2>

        {stats.customers.length === 0 ? (
          <p className="px-6 py-10 text-center text-[14px] text-duv-muted">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="border-b border-duv-line text-left text-[11px] uppercase tracking-[0.12em] text-duv-faint-ink">
                  <th scope="col" className="px-6 py-2.5 font-bold">Customer</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-bold">Orders</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-bold">Spend</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-bold">Every</th>
                  <th scope="col" className="px-6 py-2.5 text-right font-bold">Last seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-duv-line">
                {stats.top.map((c) => (
                  <tr key={c.email}>
                    <td className="px-6 py-3">
                      <span className="block font-semibold text-duv-plum">{c.name ?? "—"}</span>
                      <a
                        href={`mailto:${c.email}`}
                        className="block text-[12.5px] text-duv-violet underline-offset-2 hover:underline"
                      >
                        {c.email}
                      </a>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {c.orders}
                      {c.orders > 1 && (
                        <span className="ml-1.5 rounded-full bg-duv-mint/25 px-2 py-0.5 text-[11px] font-bold text-duv-green-ink">
                          repeat
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-display font-extrabold tabular-nums">
                      {money(c.spend)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-duv-muted">
                      {c.daysBetween === null ? "—" : `${Math.round(c.daysBetween)}d`}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-duv-muted">
                      {daysAgo(c.lastOrder, nowMs)}d ago
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-[12.5px] leading-relaxed text-duv-faint-ink">
        Customers are grouped by the email used at checkout — the only identity a guest checkout
        gives us. Someone ordering under two addresses counts twice, so these figures understate
        loyalty rather than overstating it. Read from the last {orders.length} orders in Stripe
        as of {new Date(now * 1000).toLocaleDateString("en-US", { dateStyle: "medium" })}.
      </p>
    </div>
  );
}
