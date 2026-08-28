import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { site } from "@/lib/site";
import { getProducts, categories } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "About",
  description:
    "DUV Prints and Gifts USA LLC — a family-run US supplier of DTF printing materials, custom printing, gold-plated jewelry and gifts.",
};


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

export default async function About() {
  const products = await getProducts();
  return (
    <>
      <PageHeader
        eyebrow="About us"
        title="A small US supplier that answers the phone"
        lede={`${site.legalName} has shipped ${site.external.ebayOrders} orders on eBay at ${site.external.ebayFeedback} feedback. This site is the same stock, the same people, without the marketplace fees in between.`}
      />

      <div className="mx-auto grid max-w-7xl gap-14 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="prose-duv">
          <h2>What we actually do</h2>
          <p>
            Two things, and they are more related than they look. We supply the materials that
            small print shops run through their presses — DTF film, pigment ink, hot-melt powder,
            transfer paper, heat transfer vinyl. And we sell gold-plated jewelry and gift
            articles, singly and in wholesale lots, to shops and market traders.
          </p>
          <p>
            The connection is that both are stock businesses where the person on the other end
            needs the same thing: the item they ordered, when they were told it would arrive, at
            the price they were quoted. That is a boring promise. It is also the one most online
            suppliers break.
          </p>

          <h2>Why we built this site</h2>
          <p>
            eBay has been good to us. But a marketplace flattens everyone into the same template —
            you cannot explain a return policy, publish a spec sheet, or quote a custom print job
            properly. Customers ordering DTF film for a production run need to know what they are
            getting before they commit.
          </p>
          <p>
            So this site exists to do what the marketplace listing cannot: state our terms
            plainly, publish real specifications, and let you deal with us directly.
          </p>

          <h2>How we price</h2>
          <p>
            The price on the product page is the price of the product. Shipping is a flat{" "}
            ${site.policy.shippingFlatRate.toFixed(2)}, free over $
            {site.policy.freeShippingThreshold}. Sales tax is calculated by your address at
            checkout. There is no handling fee, no card surcharge, and nothing added at the last
            step. If that sounds like a low bar, count how many stores clear it.
          </p>

          <h2>Custom printing</h2>
          <p>
            We print to your artwork on our stock or yours — sublimation and DTF. Every job gets a
            written quote and a digital proof before anything is pressed, so you approve what you
            are paying for.{" "}
            <Link href="/custom-printing">Request a quote here</Link>.
          </p>

          <h2>Talk to us</h2>
          <p>
            Email <a href={`mailto:${site.contact.support}`}>{site.contact.support}</a> for orders
            and support, or{" "}
            <a href={`mailto:${site.contact.sales}`}>{site.contact.sales}</a> for wholesale and
            custom quotes. We are open {site.contact.hours} and reply{" "}
            {site.contact.responseTime}. A person reads every message.
          </p>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-3xl border border-duv-line bg-white p-7">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-duv-faint-ink">
              At a glance
            </h2>
            <dl className="mt-5 space-y-4">
              {[
                ["Legal name", site.legalName],
                ["Products stocked", `${products.length}`],
                ["Categories", categories.map((c) => c.name).join(", ")],
                ["Ships to", site.policy.shipsTo],
                ["Marketplace record", `${site.external.ebayOrders} orders · ${site.external.ebayFeedback}`],
                ["Support hours", site.contact.hours],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[12px] font-bold uppercase tracking-wide text-duv-faint-ink">
                    {k}
                  </dt>
                  <dd className="mt-0.5 text-[14.5px] font-semibold leading-snug">{v}</dd>
                </div>
              ))}
            </dl>
            <Link
              href="/shop"
              className="mt-7 block rounded-full bg-duv-plum px-6 py-3.5 text-center text-[14.5px] font-bold text-white hover:bg-duv-violet"
            >
              Browse the catalogue
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
