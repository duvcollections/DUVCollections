import Link from "next/link";
import { Overprint } from "@/components/Overprint";
import { TrustBar } from "@/components/TrustBar";
import { ProductGrid } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { CategoryArt } from "@/components/BrandArt";
import { visibleCategories, byCategory, getProducts, priceRange } from "@/lib/catalog";
import { site, money } from "@/lib/site";


/**
 * Re-read the catalogue from D1 at most this often (seconds).
 *
 * Without this the page is prerendered at build time and served frozen: an
 * admin edit — new photographs, a price change, a restock — would be correct in
 * the database and invisible on the site until the next deploy. That is exactly
 * the bug where five saved image URLs never appeared on the product page.
 *
 * Five minutes rather than zero because the shop is on Cloudflare's free tier
 * (100k Worker requests/day) and `force-dynamic` would route every visitor,
 * crawler and bot hit through the Worker. This keeps the page static for
 * everyone in a five-minute window and refreshes it in the background after.
 */
export const revalidate = 300;

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

export default async function Home() {
  const products = await getProducts();
  const picks = featured
    .map((sku) => products.find((p) => p.sku === sku))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  // Only categories with something in them. A shelf with nothing on it tells a
  // first-time visitor the shop is half-built.
  const cats = await Promise.all(
    (await visibleCategories()).map(async (c) => ({
      ...c,
      count: (await byCategory(c.id)).length,
      min: (await priceRange(c.id)).min,
    })),
  );

  return (
    <>
      {/* ---------------------------------------------------------- hero */}
      <section className="relative isolate overflow-hidden bg-duv-shell">
        <Overprint />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <Reveal y={12}>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-duv-pink-ink">
              {site.legalName} · Shipped from Texas
            </p>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-5 max-w-[13ch] text-balance font-display text-[clamp(2.5rem,7vw,4.5rem)] font-extrabold leading-[0.98] tracking-[-0.035em]">
              Supplies that <span className="ink-gradient">behave</span>{" "}
              the same every run
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-6 max-w-[58ch] text-[18px] leading-relaxed text-duv-muted">
              Film, ink and powder that peel clean at the temperature they say they will.
              Gold-plated stock priced for a counter or a market stall. We sell what we run
              ourselves, which is why the list is short.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/shop"
                className="rounded-full bg-duv-pink-deep px-8 py-4 text-[15px] font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-duv-coral-deep"
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
          </Reveal>

          <Reveal delay={320}>
            <p className="mt-8 text-[14px] text-duv-muted">
              <strong className="font-bold text-duv-plum">{site.external.ebayOrders} orders</strong>{" "}
              shipped at{" "}
              <strong className="font-bold text-duv-plum">{site.external.ebayFeedback} feedback</strong>{" "}
              on eBay ·{" "}
              <a
                className="font-semibold text-duv-violet underline decoration-2 underline-offset-4 hover:text-duv-pink-ink"
                href={site.external.ebay}
                target="_blank"
                rel="noopener noreferrer"
              >
                see our record
              </a>
            </p>
          </Reveal>
        </div>
      </section>

      <TrustBar />

      {/* ------------------------------------------------------ categories */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <Reveal>
          <h2 className="font-display text-3xl font-extrabold tracking-[-0.025em]">
            A short list, kept in stock
          </h2>
          <p className="mt-3 max-w-[60ch] text-[16px] leading-relaxed text-duv-muted">
            Every line here is something we reorder. Nothing is drop-shipped, nothing sits in a
            catalogue we have never opened, and if it is on the site it is on a shelf in Texas.
          </p>
        </Reveal>

        <ul className="mt-9 grid gap-5 md:grid-cols-3">
          {cats.map((c, i) => (
            <li key={c.id}>
              <Reveal delay={i * 90}>
                <Link
                  href={`/shop/${c.id}`}
                  className="lift group flex h-full flex-col overflow-hidden rounded-3xl transition-colors"
                  style={{ background: c.tint }}
                >
                  {/* Brand artwork, not a photograph — see BrandArt for why. */}
                  <div className="relative h-36 overflow-hidden">
                    <CategoryArt
                      id={c.id}
                      className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-7 pt-6">
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
                      {c.count} products · from {money(c.min)}
                      <span className="ml-1.5 inline-block transition-transform group-hover:translate-x-1">
                        →
                      </span>
                    </p>
                  </div>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {/* -------------------------------------------------------- featured */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <Reveal>
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-3xl font-extrabold tracking-[-0.025em]">
              What moves fastest
            </h2>
            <Link
              href="/shop"
              className="text-[14px] font-bold text-duv-violet underline decoration-2 underline-offset-4 hover:text-duv-pink-ink"
            >
              View everything
            </Link>
          </div>
        </Reveal>
        <Reveal delay={60}>
          <ProductGrid items={picks} />
        </Reveal>
      </section>

      {/* ----------------------------------------------------- why us strip */}
      <section className="border-y border-duv-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              [
                "We run this stock ourselves",
                "The films and powders on this site are the ones in our own press room. When something stops behaving, it comes off the site — we are not clearing a warehouse.",
              ],
              [
                "One invoice, one parcel",
                "Supplies and stock ship together from the same place, so a restock is one order and one tracking number instead of three.",
              ],
              [
                "Priced for resale where it matters",
                "The wholesale lots are costed for a market stall or a counter. The single pieces are for gifting. Both are marked plainly.",
              ],
            ].map(([t, b], i) => (
              <Reveal key={t} delay={i * 90}>
                <h3 className="font-display text-[19px] font-extrabold tracking-[-0.02em]">{t}</h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-duv-muted">{b}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- custom printing */}
      <section className="relative isolate overflow-hidden bg-duv-plum">
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <Reveal>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-duv-amber">
              Custom printing
            </p>
            <h2 className="mt-4 max-w-[18ch] text-balance font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
              Send the artwork. Approve a proof. Then we press.
            </h2>
            <p className="mt-5 max-w-[54ch] text-[16px] leading-relaxed text-white/70">
              Sublimation and DTF on our blanks or yours. You get a written price and a digital
              proof before anything touches a heat press, so the first time you see the finished
              piece is not the first time you find out it was wrong.
            </p>
            <Link
              href="/custom-printing"
              className="mt-8 inline-block rounded-full bg-white px-8 py-4 text-[15px] font-bold text-duv-plum transition-transform duration-200 hover:-translate-y-0.5 hover:bg-duv-amber"
            >
              Request a quote
            </Link>
          </Reveal>

          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              ["01", "Send artwork", "PNG, JPG, PDF, AI or SVG. We'll tell you if it won't hold up at size."],
              ["02", "Get a quote", "Written price and turnaround, usually within one business day."],
              ["03", "Approve a proof", "A digital proof for sign-off. Nothing is pressed until you say yes."],
              ["04", "We print and ship", "Tracking emailed the moment the label is bought."],
            ].map(([n, t, b], i) => (
              <li key={n}>
                <Reveal delay={i * 80}>
                  <div className="h-full rounded-2xl bg-white/8 p-5 ring-1 ring-white/12">
                    <span className="font-mono text-[12px] font-bold text-duv-amber">{n}</span>
                    <h3 className="mt-2 text-[15px] font-extrabold text-white">{t}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-white/65">{b}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
