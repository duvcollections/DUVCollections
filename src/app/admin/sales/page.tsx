import { listOrders, nowSeconds } from "@/lib/orders-admin";
import { money } from "@/lib/site";
import { isAdmin } from "@/lib/access";

export const dynamic = "force-dynamic";

const DAY = 86400;

export default async function Sales() {
  // Defence in depth: the layout renders the sign-in notice, but without this
  // an unauthorised request would still run the queries below.
  if (!(await isAdmin())) return null;
  let orders;
  try {
    orders = await listOrders(60);
  } catch (err) {
    return (
      <p className="rounded-2xl border-2 border-duv-red bg-duv-red/5 p-6 text-[14px] text-duv-red">
        Couldn&rsquo;t reach Stripe: {(err as Error).message}
      </p>
    );
  }

  const now = nowSeconds();
  const windows = [
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 },
    { label: "Last 90 days", days: 90 },
  ].map((w) => {
    const set = orders.filter((o) => now - o.created < w.days * DAY);
    const revenue = set.reduce((n, o) => n + o.total, 0);
    const tax = set.reduce((n, o) => n + o.tax, 0);
    const shipping = set.reduce((n, o) => n + o.shipping, 0);
    return {
      ...w,
      count: set.length,
      revenue,
      tax,
      shipping,
      // What actually belongs to you: tax is collected on behalf of Texas.
      goods: revenue - tax - shipping,
      aov: set.length ? revenue / set.length : 0,
    };
  });

  // Units and revenue per product across everything Stripe returned
  const perItem = new Map<string, { qty: number; revenue: number }>();
  for (const o of orders) {
    for (const i of o.items) {
      const cur = perItem.get(i.title) ?? { qty: 0, revenue: 0 };
      cur.qty += i.qty;
      cur.revenue += i.amount;
      perItem.set(i.title, cur);
    }
  }
  const top = [...perItem.entries()]
    .map(([title, v]) => ({ title, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  const maxRevenue = top[0]?.revenue ?? 1;

  const lifetime = orders.reduce((n, o) => n + o.total, 0);

  return (
    <>
      <h1 className="font-display text-3xl font-extrabold tracking-[-0.025em]">Sales</h1>
      <p className="mt-2 max-w-[64ch] text-[14.5px] text-duv-muted">
        Calculated from your most recent {orders.length} paid orders in Stripe. &ldquo;Your
        goods&rdquo; strips out sales tax and shipping — tax is collected on behalf of Texas and
        isn&rsquo;t revenue.
      </p>

      <ul className="mt-7 grid gap-4 md:grid-cols-3">
        {windows.map((w) => (
          <li key={w.label} className="rounded-2xl border border-duv-line bg-white p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-duv-faint">{w.label}</p>
            <p className="mt-3 font-display text-[30px] font-extrabold leading-none tabular-nums">
              {money(w.revenue)}
            </p>
            <dl className="mt-4 space-y-1.5 border-t border-duv-line pt-3 text-[13px]">
              <div className="flex justify-between"><dt className="text-duv-muted">Orders</dt><dd className="font-semibold tabular-nums">{w.count}</dd></div>
              <div className="flex justify-between"><dt className="text-duv-muted">Average order</dt><dd className="font-semibold tabular-nums">{money(w.aov)}</dd></div>
              <div className="flex justify-between"><dt className="text-duv-muted">Your goods</dt><dd className="font-semibold tabular-nums">{money(w.goods)}</dd></div>
              <div className="flex justify-between"><dt className="text-duv-muted">Sales tax held</dt><dd className="font-semibold tabular-nums text-duv-coral">{money(w.tax)}</dd></div>
              <div className="flex justify-between"><dt className="text-duv-muted">Shipping collected</dt><dd className="font-semibold tabular-nums">{money(w.shipping)}</dd></div>
            </dl>
          </li>
        ))}
      </ul>

      <p className="mt-5 rounded-2xl border border-duv-line bg-white px-5 py-4 text-[13.5px] text-duv-muted">
        Sales tax shown is money you are holding for the State of Texas, not profit. Set it aside
        before you spend against these numbers.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-xl font-extrabold tracking-tight">Best sellers</h2>
        {top.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-duv-line bg-white p-8 text-center text-[14.5px] text-duv-muted">
            No sales yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-duv-line overflow-hidden rounded-2xl border border-duv-line bg-white">
            {top.map((t) => (
              <li key={t.title} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <span className="text-[14.5px] font-semibold">{t.title}</span>
                  <span className="text-[13px] text-duv-muted">
                    {t.qty} sold ·{" "}
                    <strong className="font-display text-[14px] text-duv-plum tabular-nums">{money(t.revenue)}</strong>
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-duv-shell">
                  <div
                    className="h-full rounded-full bg-duv-pink"
                    style={{ width: `${Math.max(3, (t.revenue / maxRevenue) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 text-[13px] text-duv-faint">
        Lifetime across these {orders.length} orders: <strong className="text-duv-muted">{money(lifetime)}</strong>.
        For full financial reporting, including payouts and fees, use the Stripe dashboard.
      </p>
    </>
  );
}
