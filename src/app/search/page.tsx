import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ProductGrid } from "@/components/ProductCard";
import { search } from "@/lib/catalog";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const results = search(q);

  return (
    <>
      <PageHeader
        eyebrow="Search"
        title={q ? `Results for “${q}”` : "Search the catalogue"}
        lede={
          q
            ? `${results.length} product${results.length === 1 ? "" : "s"} matched. Try a SKU, a material, or a product type.`
            : "Search by product name, SKU, or material — try “DTF”, “gold plated”, or “CH004”."
        }
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <form action="/search" role="search" className="mb-10 max-w-lg">
          <label htmlFor="q" className="mb-2 block text-[13px] font-bold text-duv-plum">
            Search products
          </label>
          <div className="flex gap-2">
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="DTF film, chain, BJ011…"
              className="flex-1 rounded-full border border-duv-line bg-white px-5 py-3 text-[15px] focus:border-duv-violet focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-full bg-duv-plum px-6 py-3 text-[14px] font-bold text-white hover:bg-duv-violet"
            >
              Search
            </button>
          </div>
        </form>

        {q && results.length === 0 ? (
          <div className="rounded-2xl border border-duv-line bg-white p-10 text-center">
            <p className="font-display text-xl font-extrabold">No matches for “{q}”</p>
            <p className="mx-auto mt-2 max-w-[46ch] text-[14.5px] text-duv-muted">
              Check the spelling, or try a broader word — “film” instead of “hot peel film roll”.
              If we don&rsquo;t stock it, email{" "}
              <a className="text-duv-violet underline underline-offset-2" href="mailto:sales@duvcollections.com">
                sales@duvcollections.com
              </a>{" "}
              and we&rsquo;ll tell you straight whether we can source it.
            </p>
          </div>
        ) : (
          <ProductGrid items={results} />
        )}
      </div>
    </>
  );
}
