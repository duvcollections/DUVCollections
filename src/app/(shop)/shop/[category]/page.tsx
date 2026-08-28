import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ProductGrid } from "@/components/ProductCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { categories, getCategory, byCategory, subcategoriesOf } from "@/lib/catalog";
import { CategoryFilter } from "./CategoryFilter";
import { Suspense } from "react";


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

type Params = { category: string };

export function generateStaticParams() {
  return categories.map((c) => ({ category: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { category } = await params;
  const c = getCategory(category);
  if (!c) return {};
  return { title: c.name, description: c.blurb };
}

const CHIP_BASE = "rounded-full border px-4 py-2 text-[13.5px] font-semibold transition-colors";

export default async function CategoryPage({ params }: { params: Promise<Params> }) {
  const { category } = await params;
  const c = getCategory(category);
  if (!c) notFound();

  const subs = await subcategoriesOf(category);
  const all = await byCategory(category);
  const lotCount = all.filter((p) => p.wholesale).length;

  return (
    <>
      <PageHeader eyebrow="Category" title={c.name} lede={c.long} />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <Breadcrumbs
          trail={[{ href: "/", label: "Home" }, { href: "/shop", label: "Shop" }, { label: c.name }]}
        />

        {/* Renders nothing — it reads the query string and hides what doesn't
            match, so this page can stay prerendered. */}
        <Suspense fallback={null}>
          <CategoryFilter allCount={all.length} />
        </Suspense>

        {subs.length > 1 && (
          <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Filter by type">
            <a
              href={`/shop/${category}`}
              data-chip-sub=""
              data-base={CHIP_BASE}
              aria-current="true"
              className={`${CHIP_BASE} border-duv-plum bg-duv-plum text-white`}
            >
              All <span className="ml-1 text-white/70">{all.length}</span>
            </a>
            {subs.map((s) => (
              <a
                key={s.id}
                href={`/shop/${category}?sub=${s.id}`}
                data-chip-sub={s.id}
                data-base={CHIP_BASE}
                className={`${CHIP_BASE} border-duv-line bg-white text-duv-plum hover:border-duv-violet`}
              >
                {s.label} <span className="ml-1 text-duv-faint-ink">{s.count}</span>
              </a>
            ))}
          </div>
        )}

        {lotCount > 0 && (
          <div className="mb-6">
            <a
              href={`/shop/${category}?lot=1`}
              data-chip-lot=""
              data-base={`${CHIP_BASE} inline-flex items-center gap-2`}
              className={`${CHIP_BASE} inline-flex items-center gap-2 border-duv-line bg-white text-duv-plum hover:border-duv-violet`}
            >
              <span data-lot-label="">Wholesale lots only</span>
              <span className="text-duv-faint-ink">{lotCount}</span>
            </a>
          </div>
        )}

        <p id="cat-count" className="mb-5 text-[13.5px] text-duv-muted">
          Showing {all.length} of {all.length} products
        </p>

        <div id="cat-grid">
          <ProductGrid items={all} />
        </div>

        <p
          id="cat-empty"
          hidden
          className="mt-4 rounded-2xl border border-duv-line bg-white p-10 text-center text-duv-muted"
        >
          Nothing matches that filter.{" "}
          <a href={`/shop/${category}`} className="font-bold text-duv-violet underline underline-offset-4">
            Show everything
          </a>
        </p>
      </div>
    </>
  );
}
