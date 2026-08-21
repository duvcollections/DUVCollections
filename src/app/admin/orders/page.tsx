import Link from "next/link";
import { listOrders } from "@/lib/orders-admin";
import { money } from "@/lib/site";
import { isAdmin } from "@/lib/access";

export const dynamic = "force-dynamic";

const TONE: Record<string, string> = {
  paid: "bg-duv-pink/12 text-duv-pink-ink",
  shipped: "bg-duv-mint/25 text-duv-green-ink",
  refunded: "bg-duv-line text-duv-muted",
  unpaid: "bg-duv-line text-duv-muted",
};

export default async function Orders({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  // Defence in depth: the layout renders the sign-in notice, but without this
  // an unauthorised request would still run the queries below.
  if (!(await isAdmin())) return null;
  const { status } = await searchParams;
  let orders;
  try {
    orders = await listOrders(50);
  } catch (err) {
    return (
      <p className="rounded-2xl border-2 border-duv-red bg-duv-red/5 p-6 text-[14px] text-duv-red">
        Couldn&rsquo;t reach Stripe: {(err as Error).message}
      </p>
    );
  }

  const filtered = status ? orders.filter((o) => o.status === status) : orders;
  const counts = {
    all: orders.length,
    paid: orders.filter((o) => o.status === "paid").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
  };

  return (
    <>
      <h1 className="font-display text-3xl font-extrabold tracking-[-0.025em]">Orders</h1>
      <p className="mt-2 text-[14.5px] text-duv-muted">
        Read live from Stripe. Marking an order shipped writes the tracking number back to Stripe
        and emails the customer.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {[
          { id: undefined, label: "All", n: counts.all },
          { id: "paid", label: "Awaiting dispatch", n: counts.paid },
          { id: "shipped", label: "Shipped", n: counts.shipped },
        ].map((f) => (
          <Link
            key={f.label}
            href={f.id ? `/admin/orders?status=${f.id}` : "/admin/orders"}
            aria-current={status === f.id ? "true" : undefined}
            className={`rounded-full border px-4 py-2 text-[13.5px] font-semibold transition-colors ${
              status === f.id
                ? "border-duv-plum bg-duv-plum text-white"
                : "border-duv-line bg-white text-duv-plum hover:border-duv-violet"
            }`}
          >
            {f.label} <span className="text-duv-faint-ink">{f.n}</span>
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-duv-line bg-white p-10 text-center text-[14.5px] text-duv-muted">
          No orders here yet.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-duv-line bg-white">
          <table className="w-full min-w-[720px] text-[14px]">
            <thead>
              <tr className="border-b border-duv-line text-left text-[11px] uppercase tracking-[0.12em] text-duv-faint-ink">
                <th className="px-5 py-3.5 font-bold">Reference</th>
                <th className="px-5 py-3.5 font-bold">Customer</th>
                <th className="px-5 py-3.5 font-bold">Placed</th>
                <th className="px-5 py-3.5 font-bold">Status</th>
                <th className="px-5 py-3.5 text-right font-bold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-duv-line">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-duv-shell">
                  <td className="px-5 py-4">
                    <Link href={`/admin/orders/${o.id}`} className="font-mono text-[13px] font-bold text-duv-violet">
                      {o.ref}
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <span className="block font-semibold">{o.name ?? "—"}</span>
                    <span className="block text-[12.5px] text-duv-muted">{o.email}</span>
                  </td>
                  <td className="px-5 py-4 text-[13px] text-duv-muted">
                    {new Date(o.created * 1000).toLocaleString("en-US", {
                      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${TONE[o.status]}`}>
                      {o.status === "paid" ? "Awaiting dispatch" : o.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-display font-extrabold tabular-nums">
                    {money(o.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
