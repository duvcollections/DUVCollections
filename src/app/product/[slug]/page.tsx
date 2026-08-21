import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductImage, hasPhoto } from "@/components/ProductImage";
import { AddToCart } from "@/components/AddToCart";
import { ProductGrid } from "@/components/ProductCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { products, bySlug, getCategory, related, subcategoryLabels, availability } from "@/lib/catalog";
import { site, money } from "@/lib/site";

type Params = { slug: string };

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = bySlug(slug);
  if (!p) return {};
  return {
    title: p.seoTitle,
    description: p.metaDescription,
    keywords: p.keywords,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: {
      type: "website",
      title: p.seoTitle,
      description: p.metaDescription,
      url: `${site.url}/product/${p.slug}`,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const p = bySlug(slug);
  if (!p) notFound();

  const cat = getCategory(p.category)!;
  const freeShip = p.price >= site.policy.freeShippingThreshold;
  const avail = availability(p);

  // Product structured data — this is what puts your price and availability
  // into Google's results instead of a bare blue link.
  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    sku: p.sku,
    description: p.description,
    brand: { "@type": "Brand", name: site.name },
    mpn: p.mpn,
    ...(p.upc ? { gtin12: p.upc } : {}),
    category: cat.name,
    offers: {
      "@type": "Offer",
      url: `${site.url}/product/${p.slug}`,
      priceCurrency: "USD",
      price: p.price.toFixed(2),
      availability:
        avail === "out-of-stock"
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: site.legalName },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: p.price >= site.policy.freeShippingThreshold ? 0 : site.policy.shippingFlatRate,
          currency: "USD",
        },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "US" },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "US",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: site.policy.returnWindowDays,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/ReturnShippingFees",
      },
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
      <Breadcrumbs
        trail={[
          { href: "/", label: "Home" },
          { href: "/shop", label: "Shop" },
          { href: `/shop/${p.category}`, label: cat.name },
          { label: p.title },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <ProductImage
            sku={p.sku}
            category={p.category}
            art={p.art}
            title={p.title}
            priority
            className="aspect-square rounded-3xl border border-duv-line"
          />
          {!hasPhoto(p.sku) && (
            <p className="mt-3 text-center text-[12.5px] text-duv-faint">
              Illustration — photography in progress. Specifications below are accurate.
            </p>
          )}
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-duv-faint">
            {subcategoryLabels[p.subcategory] ?? p.subcategory} · SKU {p.sku}
          </p>
          <h1 className="mt-2.5 text-balance font-display text-[clamp(1.75rem,3.5vw,2.5rem)] font-extrabold leading-[1.08] tracking-[-0.03em]">
            {p.title}
          </h1>

          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <span className="font-display text-4xl font-extrabold tabular-nums">
              {money(p.price)}
            </span>
            {p.wholesale && (
              <span className="rounded-full bg-duv-violet/15 px-3 py-1 text-[12.5px] font-bold text-duv-violet">
                Wholesale lot
              </span>
            )}
            {avail === "out-of-stock" ? (
              <span className="rounded-full bg-duv-line px-3 py-1 text-[12.5px] font-bold text-duv-muted">
                Out of stock
              </span>
            ) : avail === "low-stock" ? (
              <span className="rounded-full bg-duv-coral/20 px-3 py-1 text-[12.5px] font-bold text-duv-coral">
                Only {p.stock} left
              </span>
            ) : (
              <span className="rounded-full bg-duv-mint/25 px-3 py-1 text-[12.5px] font-bold text-duv-green">
                In stock
              </span>
            )}
          </div>

          <p className="mt-5 text-[16px] leading-relaxed text-duv-muted">{p.description}</p>

          {p.highlights.length > 0 && (
            <ul className="mt-5 space-y-2">
              {p.highlights.map((h) => (
                <li key={h} className="flex gap-2.5 text-[14.5px] leading-relaxed text-duv-muted">
                  <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-duv-pink" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          )}

          {p.goodFor && (
            <p className="mt-5 rounded-2xl bg-duv-shell px-4 py-3 text-[14px] text-duv-plum/80">
              <span className="font-bold text-duv-plum">Good for:</span> {p.goodFor}
            </p>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <AddToCart sku={p.sku} />
            <Link
              href="/cart"
              className="text-[14px] font-bold text-duv-violet underline decoration-2 underline-offset-4 hover:text-duv-pink"
            >
              View cart
            </Link>
          </div>

          {/* Everything a buyer needs to know before committing, stated up front */}
          <dl className="mt-8 divide-y divide-duv-line rounded-2xl border border-duv-line bg-white">
            <div className="flex items-baseline justify-between gap-6 px-5 py-3.5">
              <dt className="text-[13.5px] font-semibold text-duv-plum">Shipping</dt>
              <dd className="text-right text-[13.5px] text-duv-muted">
                {freeShip ? (
                  <span className="font-bold text-duv-green">Free US shipping</span>
                ) : (
                  <>
                    {money(site.policy.shippingFlatRate)} flat · free over{" "}
                    {money(site.policy.freeShippingThreshold)}
                  </>
                )}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-6 px-5 py-3.5">
              <dt className="text-[13.5px] font-semibold text-duv-plum">Dispatch</dt>
              <dd className="text-right text-[13.5px] text-duv-muted">
                {site.policy.handlingDays}, then {site.policy.deliveryEstimate}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-6 px-5 py-3.5">
              <dt className="text-[13.5px] font-semibold text-duv-plum">Returns</dt>
              <dd className="text-right text-[13.5px] text-duv-muted">
                {site.policy.returnWindowDays} days ·{" "}
                <Link className="text-duv-violet underline underline-offset-2" href="/policies/returns">
                  read the policy
                </Link>
              </dd>
            </div>
          </dl>

          {Object.keys(p.specs).length > 0 && (
            <section className="mt-8">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-duv-faint">
                Specifications
              </h2>
              <dl className="mt-3 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                {Object.entries({
                  ...p.specs,
                  "Item number": p.mpn,
                  ...(p.upc ? { UPC: p.upc } : {}),
                  "Ship weight": `${p.shipWeightOz} oz`,
                  Condition: "New",
                }).map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-4 border-b border-duv-line py-2">
                    <dt className="text-[13.5px] text-duv-muted">{k}</dt>
                    <dd className="text-right text-[13.5px] font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </div>

      <section className="mt-20">
        <h2 className="mb-6 font-display text-2xl font-extrabold tracking-[-0.02em]">
          You might also need
        </h2>
        <ProductGrid items={related(p)} />
      </section>
    </div>
  );
}
