import Link from "next/link";
import { isAdmin } from "@/lib/access";
import { getProducts } from "@/lib/catalog";
import { photosFor } from "@/components/ProductImage";
import { CHANNELS, readiness } from "@/lib/channels";
import { site } from "@/lib/site";
import type { Product } from "@/lib/catalog";

export const metadata = { title: "Sales channels" };
export const dynamic = "force-dynamic";

export default async function ChannelsPage() {
  if (!(await isAdmin())) return null;

  const products = await getProducts();
  const hasImage = (p: Product) => photosFor(p.sku, p.images).length > 0;
  const rows = CHANNELS.map((c) => readiness(c, products, hasImage));

  // The same product usually blocks every channel for the same reason, so a
  // combined list is more actionable than four near-identical ones.
  const reasons = new Map<string, number>();
  for (const b of rows[0]?.blocked ?? []) {
    reasons.set(b.reason, (reasons.get(b.reason) ?? 0) + 1);
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em]">Sales channels</h1>
        <p className="mt-2 max-w-[72ch] text-[14.5px] leading-relaxed text-duv-muted">
          Your catalogue, in the shape each marketplace expects. These are live URLs — set the
          channel to fetch one on a schedule and your listings follow whatever you change here.
          Nothing is pushed automatically, so nothing goes live until you connect it.
        </p>
      </header>

      {reasons.size > 0 && (
        <section className="rounded-3xl border-2 border-duv-amber bg-tint-jewelry p-6">
          <h2 className="font-display text-[16px] font-extrabold tracking-tight text-duv-plum">
            What is holding products back
          </h2>
          <ul className="mt-3 space-y-1.5">
            {[...reasons.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([reason, count]) => (
                <li key={reason} className="text-[13.5px] text-duv-plum/80">
                  <strong className="font-bold text-duv-plum">{count}</strong> · {reason}
                </li>
              ))}
          </ul>
          <p className="mt-3 text-[12.5px] leading-relaxed text-duv-plum/70">
            Every channel rejects a product without a photograph, so photography is the one thing
            that unblocks all four at once.
          </p>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {rows.map(({ channel, ready, blocked }) => (
          <section
            key={channel.id}
            className="flex flex-col rounded-3xl border border-duv-line bg-white p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-[18px] font-extrabold tracking-tight">
                  {channel.name}
                </h2>
                <p className="mt-1 text-[12.5px] text-duv-faint-ink">{channel.format}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-bold ${
                  ready.length > 0
                    ? "bg-duv-mint/25 text-duv-green-ink"
                    : "bg-duv-line text-duv-muted"
                }`}
              >
                {ready.length} ready
              </span>
            </div>

            <p className="mt-4 text-[13px] text-duv-muted">
              {ready.length === 0 ? (
                <>
                  Nothing can be listed yet — {blocked.length} product
                  {blocked.length === 1 ? "" : "s"} blocked.
                </>
              ) : (
                <>
                  {ready.length} of {ready.length + blocked.length} products would be accepted.
                </>
              )}
            </p>

            <div className="mt-4 rounded-2xl bg-duv-shell px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-duv-faint-ink">
                Feed URL
              </p>
              <a
                href={channel.feedPath}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block break-all font-mono text-[12.5px] text-duv-violet underline-offset-2 hover:underline"
              >
                {site.url}
                {channel.feedPath}
              </a>
            </div>

            <details className="mt-4">
              <summary className="cursor-pointer text-[13px] font-bold text-duv-plum">
                How to connect it
              </summary>
              <ol className="mt-2 space-y-1.5 pl-4">
                {channel.setup.map((step, i) => (
                  <li key={i} className="list-decimal text-[13px] leading-relaxed text-duv-muted">
                    {step}
                  </li>
                ))}
              </ol>
              {channel.extraRules.length > 0 && (
                <ul className="mt-3 space-y-1 pl-4">
                  {channel.extraRules.map((r) => (
                    <li key={r} className="list-disc text-[12.5px] leading-relaxed text-duv-faint-ink">
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </details>
          </section>
        ))}
      </div>

      <section className="rounded-2xl border border-duv-line bg-white p-6">
        <h2 className="font-display text-[15px] font-extrabold tracking-tight">
          Before you connect anything
        </h2>
        <p className="mt-2 max-w-[72ch] text-[13.5px] leading-relaxed text-duv-muted">
          You already sell on eBay. Listing the same stock through a feed can create a{" "}
          <strong className="font-bold text-duv-plum">second listing</strong> for something already
          up, and the two hold separate quantities — so selling the last one twice is a real
          risk. Check what is already listed before the first eBay upload.{" "}
          <Link href="/admin/ebay" className="font-bold text-duv-violet underline underline-offset-2">
            The eBay import
          </Link>{" "}
          will show you.
        </p>
      </section>
    </div>
  );
}
