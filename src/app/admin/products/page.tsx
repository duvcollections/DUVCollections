import Link from "next/link";
import { allProducts, availability, categories, subcategoryLabels } from "@/lib/catalog";
import { dbAvailable } from "@/lib/db";
import { money } from "@/lib/site";
import { SeedButton } from "./SeedButton";
import { isAdmin } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function Products({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; view?: string }>;
}) {
  // Defence in depth: the layout renders the sign-in notice, but without this
  // an unauthorised request would still run the queries below.
  if (!(await isAdmin())) return null;
  const { q = "", cat, view } = await searchParams;
  const [all, hasDb] = await Promise.all([allProducts(), dbAvailable()]);

  let rows = all;
  if (view !== "archived") rows = rows.filter((p) => !p.archived);
  else rows = rows.filter((p) => p.archived);
  if (cat) rows = rows.filter((p) => p.category === cat);
  if (q.trim()) {
    const t = q.toLowerCase();
    rows = rows.filter((p) => `${p.title} ${p.sku}`.toLowerCase().includes(t));
  }

  const needsAttention = all.filter((p) => !p.archived && availability(p) !== "in-stock");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.025em]">Products</h1>
        <Link
          href="/admin/products/new"
          className="rounded-full bg-duv-pink px-6 py-3 text-[14px] font-bold text-white hover:bg-duv-coral"
        >
          Add product
        </Link>
      </div>

      {!hasDb ? (
        <div className="mt-6 rounded-2xl border-2 border-duv-amber bg-tint-jewelry p-6">
          <p className="text-[14px] font-bold text-duv-plum">No database bound — edits won&rsquo;t save</p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-duv-plum/80">
            The list below is the bundled seed file. Create the D1 database, add the{" "}
            <code>DB</code> binding in <code>wrangler.jsonc</code>, run the migration in{" "}
            <code>migrations/0001_init.sql</code>, then redeploy.
          </p>
        </div>
      ) : all.length > 0 && all.every((p) => !p.archived) && (
        <SeedButton count={all.length} />
      )}

      {needsAttention.length > 0 && (
        <p className="mt-6 rounded-2xl border border-duv-line bg-white px-5 py-4 text-[13.5px]">
          <strong className="text-duv-coral">{needsAttention.length}</strong>{" "}
          <span className="text-duv-muted">product(s) low or out of stock —</span>{" "}
          {needsAttention.slice(0, 6).map((p) => (
            <Link key={p.sku} href={`/admin/products/${p.sku}`} className="mr-2 font-mono text-[12.5px] font-bold text-duv-violet">
              {p.sku}
            </Link>
          ))}
          {needsAttention.length > 6 && <span className="text-duv-faint">and {needsAttention.length - 6} more</span>}
        </p>
      )}

      <form className="mt-6 flex flex-wrap gap-2" action="/admin/products">
        <input
          name="q" defaultValue={q} placeholder="Search title or SKU…"
          className="w-56 rounded-full border border-duv-line bg-white px-4 py-2 text-[13.5px] focus:border-duv-violet focus:outline-none"
        />
        <select name="cat" defaultValue={cat ?? ""} className="rounded-full border border-duv-line bg-white px-4 py-2 text-[13.5px]">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="view" defaultValue={view ?? ""} className="rounded-full border border-duv-line bg-white px-4 py-2 text-[13.5px]">
          <option value="">Active</option>
          <option value="archived">Archived</option>
        </select>
        <button className="rounded-full bg-duv-plum px-5 py-2 text-[13.5px] font-bold text-white hover:bg-duv-violet">
          Filter
        </button>
      </form>

      <p className="mt-4 text-[13px] text-duv-muted">{rows.length} product(s)</p>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-duv-line bg-white">
        <table className="w-full min-w-[760px] text-[14px]">
          <thead>
            <tr className="border-b border-duv-line text-left text-[11px] uppercase tracking-[0.12em] text-duv-faint">
              <th className="px-5 py-3.5 font-bold">SKU</th>
              <th className="px-5 py-3.5 font-bold">Product</th>
              <th className="px-5 py-3.5 font-bold">Type</th>
              <th className="px-5 py-3.5 text-right font-bold">Price</th>
              <th className="px-5 py-3.5 text-right font-bold">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-duv-line">
            {rows.map((p) => {
              const av = availability(p);
              return (
                <tr key={p.sku} className="hover:bg-duv-shell">
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/products/${p.sku}`} className="font-mono text-[12.5px] font-bold text-duv-violet">
                      {p.sku}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-semibold">{p.title}</span>
                    {p.wholesale && <span className="ml-2 rounded-full bg-duv-violet/12 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-duv-violet">Lot</span>}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-duv-muted">
                    {subcategoryLabels[p.subcategory] ?? p.subcategory}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums">{money(p.price)}</td>
                  <td className="px-5 py-3.5 text-right">
                    {p.stock === null ? (
                      <span className="text-[12.5px] text-duv-faint">not counted</span>
                    ) : (
                      <span className={`font-bold tabular-nums ${
                        av === "out-of-stock" ? "text-duv-red" : av === "low-stock" ? "text-duv-coral" : "text-duv-green"
                      }`}>{p.stock}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
