import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ProductGrid } from "@/components/ProductCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getProducts, visibleCategories, byCategory } from "@/lib/catalog";


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

export const metadata: Metadata = {
  title: "Shop all products",
  description:
    "The full DUV Collections catalogue — DTF supplies, heat transfer paper, gold-plated jewelry and sunglasses.",
};

export default async function ShopAll() {
  const products = await getProducts();
  const counts = Object.fromEntries(
    await Promise.all((await visibleCategories()).map(async (c) => [c.id, (await byCategory(c.id)).length] as const)),
  ) as Record<string, number>;

  return (
    <>
      <PageHeader
        eyebrow="Catalogue"
        title="Everything we stock"
        lede={`All ${products.length} products, priced in US dollars and shipped from the USA. Prices include no hidden fees — what you see is what appears at checkout, plus shipping and any sales tax.`}
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <Breadcrumbs trail={[{ href: "/", label: "Home" }, { label: "Shop" }]} />

        <div className="mb-8 flex flex-wrap gap-2">
          {(await visibleCategories()).map((c) => (
            <Link
              key={c.id}
              href={`/shop/${c.id}`}
              className="rounded-full border border-duv-line bg-white px-4 py-2 text-[13.5px] font-semibold text-duv-plum transition-colors hover:border-duv-violet hover:text-duv-violet"
            >
              {c.name}
              <span className="ml-1.5 text-duv-faint-ink">{counts[c.id]}</span>
            </Link>
          ))}
        </div>

        <ProductGrid items={products} />
      </div>
    </>
  );
}
