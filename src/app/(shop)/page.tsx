import Link from "next/link";
import Image from "next/image";
import { Overprint } from "@/components/Overprint";
import { TrustBar } from "@/components/TrustBar";
import { ProductGrid } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { CategoryArt } from "@/components/BrandArt";
import { PhotoDrift } from "@/components/PhotoDrift";
import { CountUp } from "@/components/CountUp";
import { photoUrls } from "@/components/ProductImage";
import { visibleCategories, byCategory, getProducts, priceRange } from "@/lib/catalog";
import { site, money } from "@/lib/site";


/**
 * Rendered per request, not prerendered at build time.
 *
 * D1 is only reachable through the Cloudflare request context. At build time
 * `getCloudflareContext()` throws, `getDb()` returns null, and `allProducts()`
 * quietly falls back to the seed JSON — which has no photographs, no live
 * stock and no cost prices. A prerendered page therefore bakes in the seed and
 * shows it forever, which is exactly the bug where five saved image URLs sat
 * correctly in D1 and never appeared on the product page.
 *
 * `revalidate` alone could not fix that: the first render still happened at
 * build time against the seed, and re-rendering later still produced a page
 * built from whatever the build saw. The data has to be read where the
 * binding exists, so the render has to happen there too.
 *
 * The cost is one Worker invocation per uncached page view. Cloudflare's free
 * tier allows 100k/day and the CDN still absorbs repeat hits within the
 * cache window below, so this stays comfortably inside budget.
 */
export const dynamic = "force-dynamic";

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
  //
  // Each card now carries a real photograph when one of its products has one.
  // `cover` is null for a category with no photography yet, and the card falls
  // back to the illustration — the same honest default as everywhere else.
  const cats = await Promise.all(
    (await visibleCategories()).map(async (c) => {
      const inCat = await byCategory(c.id);
      const shot = inCat.find((x) => photoUrls(x.sku, x.images).length > 0);
      return {
        ...c,
        count: inCat.length,
        min: (await priceRange(c.id)).min,
        cover: shot ? photoUrls(shot.sku, shot.images)[0] : null,
        coverAlt: shot ? shot.title : "",
      };
    }),
  );

  // Hero collage: one photograph per category first, then fill from whatever
  // else is photographed. Spreading across categories means the collage shows
  // the breadth of the shop rather than five near-identical pendants.
  const photographed = products.filter((x) => photoUrls(x.sku, x.images).length > 0);
  const seen = new Set<string>();
  const heroPicks = [
    ...cats
      .map((c) => photographed.find((x) => x.category === c.id))
      .filter((x): x is NonNullable<typeof x> => Boolean(x)),
    ...photographed,
  ].filter((x) => (seen.has(x.sku) ? false : seen.add(x.sku)));

  const heroPhotos = heroPicks.slice(0, 5).map((x) => ({
    src: photoUrls(x.sku, x.images)[0],
    alt: x.title,
  }));


  return (
    <>
      {/* ---------------------------------------------------------- hero */}
      <section className="relative isolate overflow-hidden bg-duv-shell">
        <Overprint />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
        <div>
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

          {/* Real photographs, not illustrations — the shop finally has them.
              Hidden below `lg` because a five-tile collage on a phone pushes
              the buy buttons off the first screen, which costs more than the
              picture gains. */}
          {heroPhotos.length >= 3 && (
            <Reveal delay={200} y={20} className="hidden lg:block">
              <PhotoDrift photos={heroPhotos} />
            </Reveal>
          )}
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
                  {/* A real photograph once the category has one; the brand
                      illustration until then. A stock photo standing in for a
                      product nobody has shot is how a shop earns "not as
                      described" claims — see BrandArt for the full reasoning. */}
                  <div className="relative h-40 overflow-hidden">
                    {c.cover ? (
                      <Image
                        src={c.cover}
                        alt={c.coverAlt}
                        fill
                        sizes="(max-width: 768px) 100vw, 380px"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                      />
                    ) : (
                      <CategoryArt
                        id={c.id}
                        className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    )}
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

      {/* ------------------------------------------------------ proof band */}
      {/*
        * Every figure here is checked, not asserted.
        *
        * The eBay numbers were read off the live store this session and are
        * rounded DOWN in site.ts (eBay shows "1.9K sold", which is at least
        * 1,900 and possibly 1,999 — "1,900+" is true either way). The product
        * count is computed from the catalogue at request time, so it cannot
        * drift out of step with what is actually on the shelf.
        */}
      <section className="border-y border-duv-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: 1900,
                suffix: "+",
                label: "orders shipped",
                note: "On eBay as DUV Prints and Gifts USA, since 2023.",
              },
              {
                n: 100,
                suffix: "%",
                label: "positive feedback",
                note: "Across every one of those orders. Not a selected window.",
              },
              {
                n: products.length,
                suffix: "",
                label: "products in stock",
                note: "Counted live from the catalogue as this page loaded.",
              },
              {
                n: site.policy.freeShippingThreshold,
                prefix: "$",
                label: "for free shipping",
                note: `Flat rates below that. ${site.policy.returnWindowDays}-day returns either way.`,
              },
            ].map((s, i) => (
              <li key={s.label}>
                <Reveal delay={i * 80}>
                  <p className="font-display text-[40px] font-extrabold leading-none tracking-[-0.03em] text-duv-plum tabular-nums">
                    <CountUp value={s.n} prefix={s.prefix ?? ""} suffix={s.suffix ?? ""} />
                  </p>
                  <p className="mt-2.5 text-[14px] font-bold text-duv-plum">{s.label}</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-duv-muted">{s.note}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
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
