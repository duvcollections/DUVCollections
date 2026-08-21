import Link from "next/link";
import { Overprint } from "@/components/Overprint";
import { TrustBar } from "@/components/TrustBar";
import { ProductGrid } from "@/components/ProductCard";
import { categories, byCategory, products, priceRange } from "@/lib/catalog";
import { site, money } from "@/lib/site";

const featured = [
  "DTF-ROLL-30-100",
  "HTP-DARK-100",
  "CH004",
  "BJ100PAIR",
  "DTF-POWDER-500",
  "PND003",
  "SG-LOCS",
  "WBG006",
];

export default function Home() {
  const picks = featured
    .map((sku) => products.find((p) => p.sku === sku))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <>
      {/* ---------------------------------------------------------- hero */}
      <section className="relative isolate overflow-hidden bg-duv-shell">
        <Overprint />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-duv-pink">
            {site.legalName} · Shipped from the USA
          </p>
          <h1 className="mt-5 max-w-[15ch] text-balance font-display text-[clamp(2.5rem,7vw,4.5rem)] font-extrabold leading-[0.98] tracking-[-0.035em]">
            Everything we <span className="ink-gradient">print, press</span> and plate
          </h1>
          <p className="mt-6 max-w-[56ch] text-[18px] leading-relaxed text-duv-muted">
            DTF film, pigment ink and hot-melt powder for your press. Gold-plated chains,
            pendants and wholesale earring lots for your counter. One supplier, one invoice,
            one tracking number.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/shop"
              className="rounded-full bg-duv-pink px-8 py-4 text-[15px] font-bold text-white transition-colors hover:bg-duv-coral"
            >
              Shop all {products.length} products
            </Link>
            <Link
              href="/custom-printing"
              className="rounded-full border-2 border-duv-plum px-8 py-[14px] text-[15px] font-bold text-duv-plum transition-colors hover:border-duv-violet hover:text-duv-violet"
            >
              Get a custom print quote
            </Link>
          </div>

          <p className="mt-8 text-[14px] text-duv-muted">
            <strong className="font-bold text-duv-plum">{site.external.ebayOrders} orders</strong>{" "}
            shipped at{" "}
            <strong className="font-bold text-duv-plum">{site.external.ebayFeedback} feedback</strong>{" "}
            on eBay ·{" "}
            <a
              className="font-semibold text-duv-violet underline decoration-2 underline-offset-4 hover:text-duv-pink"
              href={site.external.ebay}
              target="_blank"
              rel="noopener noreferrer"
            >
              see our record
            </a>
          </p>
        </div>
      </section>

      <TrustBar />

      {/* ------------------------------------------------------ categories */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <h2 className="font-display text-3xl font-extrabold tracking-[-0.025em]">
          Three shelves, no filler
        </h2>
        <p className="mt-3 max-w-[58ch] text-[16px] leading-relaxed text-duv-muted">
          We stock a narrow range on purpose. Everything here is something we use, sell weekly,
          and can restock quickly.
        </p>

        <ul className="mt-9 grid gap-5 md:grid-cols-3">
          {categories.map((c) => {
            const count = byCategory(c.id).length;
            const { min } = priceRange(c.id);
            return (
              <li key={c.id}>
                <Link
                  href={`/shop/${c.id}`}
                  className="lift group flex h-full flex-col justify-between rounded-3xl p-7 transition-colors"
                  style={{ background: c.tint }}
                >
                  <div>
                    <span
                      className="block h-1.5 w-10 rounded-full"
                      style={{ background: c.accent }}
                      aria-hidden="true"
                    />
                    <h3 className="mt-4 font-display text-[24px] font-extrabold tracking-[-0.02em]">
                      {c.name}
                    </h3>
                    <p className="mt-2.5 text-[14.5px] leading-relaxed text-duv-plum/70">
                      {c.blurb}
                    </p>
                  </div>
                  <p className="mt-8 text-[13px] font-bold text-duv-plum">
                    {count} products · from {money(min)}
                    <span className="ml-1.5 inline-block transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* -------------------------------------------------------- featured */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-extrabold tracking-[-0.025em]">
            What moves fastest
          </h2>
          <Link
            href="/shop"
            className="text-[14px] font-bold text-duv-violet underline decoration-2 underline-offset-4 hover:text-duv-pink"
          >
            View everything
          </Link>
        </div>
        <ProductGrid items={picks} />
      </section>

      {/* ------------------------------------------------- custom printing */}
      <section className="relative isolate overflow-hidden bg-duv-plum">
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-duv-amber">
              Custom printing
            </p>
            <h2 className="mt-4 max-w-[18ch] text-balance font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
              Send us the artwork. We&rsquo;ll send back a proof.
            </h2>
            <p className="mt-5 max-w-[54ch] text-[16px] leading-relaxed text-white/70">
              Sublimation and DTF printing on our stock or yours. Every job starts with a written
              quote and a digital proof you approve before we press anything — so nothing arrives
              as a surprise.
            </p>
            <Link
              href="/custom-printing"
              className="mt-8 inline-block rounded-full bg-white px-8 py-4 text-[15px] font-bold text-duv-plum transition-colors hover:bg-duv-amber"
            >
              Request a quote
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              ["01", "Send artwork", "PNG, JPG, PDF, AI or SVG. We'll tell you if it won't hold up at size."],
              ["02", "Get a quote", "Written price and turnaround, usually within one business day."],
              ["03", "Approve a proof", "A digital proof for sign-off. Nothing is pressed until you say yes."],
              ["04", "We print and ship", "Tracking emailed the moment the label is bought."],
            ].map(([n, t, b]) => (
              <li key={n} className="rounded-2xl bg-white/8 p-5 ring-1 ring-white/12">
                <span className="font-mono text-[12px] font-bold text-duv-amber">{n}</span>
                <h3 className="mt-2 text-[15px] font-extrabold text-white">{t}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/65">{b}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
