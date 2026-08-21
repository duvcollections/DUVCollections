import { isAdmin } from "@/lib/access";
import { stripeClient, secret } from "@/lib/stripe";
import { listDiscounts, type DiscountRow } from "@/lib/discounts";
import { money } from "@/lib/site";
import { DiscountForm } from "./DiscountForm";
import { ToggleCode } from "./ToggleCode";

export const metadata = { title: "Discounts" };

async function load(): Promise<{ rows: DiscountRow[]; error: string | null }> {
  try {
    const stripe = stripeClient(await secret("STRIPE_SECRET_KEY"));
    return { rows: await listDiscounts(stripe), error: null };
  } catch (err) {
    return { rows: [], error: (err as Error).message };
  }
}

export default async function DiscountsPage() {
  // Guard before doing any work: an unauthenticated GET should not cost a
  // Stripe API call, even though its output would be discarded.
  if (!(await isAdmin())) return null;

  const { rows, error } = await load();
  const live = rows.filter((r) => r.active);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em]">Discount codes</h1>
        <p className="mt-2 max-w-[70ch] text-[14.5px] leading-relaxed text-duv-muted">
          Codes are entered by the customer on the Stripe checkout page. {live.length} active
          {live.length === 1 ? " code" : " codes"} right now. Deactivating a code stops new
          redemptions without touching orders that already used it.
        </p>
      </header>

      <DiscountForm />

      {error && (
        <p className="rounded-2xl bg-duv-coral/15 px-5 py-4 text-[13.5px] font-semibold text-duv-coral">
          Couldn&apos;t load existing codes: {error}
        </p>
      )}

      <section className="overflow-hidden rounded-3xl border border-duv-line bg-white">
        <h2 className="border-b border-duv-line px-6 py-4 font-display text-lg font-extrabold">
          All codes
        </h2>

        {rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-[14px] text-duv-muted">
            No discount codes yet. Create one above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="border-b border-duv-line text-left text-[11px] uppercase tracking-[0.12em] text-duv-faint-ink">
                  <th scope="col" className="px-6 py-3 font-bold">Code</th>
                  <th scope="col" className="px-4 py-3 font-bold">Discount</th>
                  <th scope="col" className="px-4 py-3 font-bold">Used</th>
                  <th scope="col" className="px-4 py-3 font-bold">Minimum</th>
                  <th scope="col" className="px-4 py-3 font-bold">Expires</th>
                  <th scope="col" className="px-4 py-3 font-bold">Status</th>
                  <th scope="col" className="px-6 py-3 font-bold"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-duv-line">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-6 py-3.5 font-mono font-bold text-duv-plum">{r.code}</td>
                    <td className="px-4 py-3.5 text-duv-muted">{r.label}</td>
                    <td className="px-4 py-3.5 tabular-nums text-duv-muted">
                      {r.timesRedeemed}
                      {r.maxRedemptions !== null && ` / ${r.maxRedemptions}`}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums text-duv-muted">
                      {r.minimumOrder === null ? "—" : money(r.minimumOrder)}
                    </td>
                    <td className="px-4 py-3.5 text-duv-muted">{r.expiresOn ?? "—"}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${
                          r.active
                            ? "bg-duv-mint/25 text-duv-green-ink"
                            : "bg-duv-line text-duv-muted"
                        }`}
                      >
                        {r.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <ToggleCode id={r.id} active={r.active} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
