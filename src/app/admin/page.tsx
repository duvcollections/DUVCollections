import Link from "next/link";
import { listOrders, nowSeconds } from "@/lib/orders-admin";
import { allProducts, availability } from "@/lib/catalog";
import { dbAvailable } from "@/lib/db";
import { money } from "@/lib/site";
import { isAdmin } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  // Defence in depth: the layout renders the sign-in notice, but without this
  // an unauthorised request would still run the queries below.
  if (!(await isAdmin())) return null;
  const [orders, products, hasDb] = await Promise.all([
    listOrders(100).catch(() => []),
    allProducts(),
    dbAvailable(),
  ]);

  const now = nowSeconds();
  const last30 = orders.filter((o) => now - o.created < 60 * 60 * 24 * 30);
  const revenue30 = last30.reduce((n, o) => n + o.total, 0);
  const unshipped = orders.filter((o) => o.status === "paid");
  const lowStock = products.filter(
    (p) => !p.archived && availability(p) !== "in-stock",
  );

  const stats = [
    { label: "Awaiting dispatch", value: String(unshipped.length), href: "/admin/orders", tone: unshipped.length ? "#FF2E93" : "#2EE6A8" },
    { label: "Orders, last 30 days", value: String(last30.length), href: "/admin/sales", tone: "#7B3FF2" },
    { label: "Revenue, last 30 days", value: money(revenue30), href: "/admin/sales", tone: "#00CFFF" },
    { label: "Low or out of stock", value: String(lowStock.length), href: "/admin/products", tone: lowStock.length ? "#FFC53D" : "#2EE6A8" },
  ];

  return (
    <>
      <h1 className="font-display text-3xl font-extrabold tracking-[-0.025em]">Overview</h1>

      {!hasDb && (
        <p className="mt-5 rounded-2xl border-2 border-duv-amber bg-tint-jewelry p-5 text-[14px] leading-relaxed text-duv-plum">
          <strong>No database bound.</strong> Products are being read from the bundled seed file,
          and edits won&rsquo;t save. Create the D1 database and add the <code>DB</code> binding,
          then run the migration.
        </p>
      )}

      <ul className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <li key={s.label}>
            <Link href={s.href} className="lift block rounded-2xl border border-duv-line bg-white p-6">
              <span className="block h-1.5 w-9 rounded-full" style={{ background: s.tone }} aria-hidden="true" />
              <p className="mt-3.5 font-display text-[28px] font-extrabold tabular-nums leading-none">
                {s.value}
              </p>
              <p className="mt-2 text-[13px] text-duv-muted">{s.label}</p>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-xl font-extrabold tracking-tight">Needs packing</h2>
          <Link href="/admin/orders" className="text-[13.5px] font-bold text-duv-violet underline underline-offset-4">
            All orders
          </Link>
        </div>
        {unshipped.length === 0 ? (
          <p className="rounded-2xl border border-duv-line bg-white p-8 text-center text-[14.5px] text-duv-muted">
            Nothing waiting. Every paid order has shipped.
          </p>
        ) : (
          <ul className="divide-y divide-duv-line overflow-hidden rounded-2xl border border-duv-line bg-white">
            {unshipped.slice(0, 8).map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-4 hover:bg-duv-shell">
                  <span className="font-mono text-[13px] font-bold">{o.ref}</span>
                  <span className="text-[14px]">{o.name ?? o.email}</span>
                  <span className="text-[13px] text-duv-muted">
                    {o.items.reduce((n, i) => n + i.qty, 0)} item(s)
                  </span>
                  <span className="ml-auto font-display text-[15px] font-extrabold tabular-nums">
                    {money(o.total)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
