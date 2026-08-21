import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ProductGrid } from "@/components/ProductCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { categories, getCategory, byCategory, subcategoriesOf } from "@/lib/catalog";

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

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ sub?: string; lot?: string }>;
}) {
  const { category } = await params;
  const { sub, lot } = await searchParams;
  const c = getCategory(category);
  if (!c) notFound();

  const subs = subcategoriesOf(category);
  const all = byCategory(category);
  let items = sub ? all.filter((p) => p.subcategory === sub) : all;
  if (lot === "1") items = items.filter((p) => p.wholesale);
  const lotCount = (sub ? all.filter((p) => p.subcategory === sub) : all).filter(
    (p) => p.wholesale,
  ).length;

  return (
    <>
      <PageHeader eyebrow="Category" title={c.name} lede={c.long} />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <Breadcrumbs
          trail={[{ href: "/", label: "Home" }, { href: "/shop", label: "Shop" }, { label: c.name }]}
        />

        {subs.length > 1 && (
          <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Filter by type">
            <Link
              href={`/shop/${category}`}
              aria-current={!sub ? "true" : undefined}
              className={`rounded-full border px-4 py-2 text-[13.5px] font-semibold transition-colors ${
                !sub
                  ? "border-duv-plum bg-duv-plum text-white"
                  : "border-duv-line bg-white text-duv-plum hover:border-duv-violet"
              }`}
            >
              All <span className="ml-1 opacity-60">{all.length}</span>
            </Link>
            {subs.map((s) => (
              <Link
                key={s.id}
                href={`/shop/${category}?sub=${s.id}`}
                aria-current={sub === s.id ? "true" : undefined}
                className={`rounded-full border px-4 py-2 text-[13.5px] font-semibold transition-colors ${
                  sub === s.id
                    ? "border-duv-plum bg-duv-plum text-white"
                    : "border-duv-line bg-white text-duv-plum hover:border-duv-violet"
                }`}
              >
                {s.label} <span className="ml-1 opacity-60">{s.count}</span>
              </Link>
            ))}
          </div>
        )}

        {lotCount > 0 && (
          <div className="mb-6">
            <Link
              href={`/shop/${category}?${new URLSearchParams({
                ...(sub ? { sub } : {}),
                ...(lot === "1" ? {} : { lot: "1" }),
              })}`}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13.5px] font-semibold transition-colors ${
                lot === "1"
                  ? "border-duv-violet bg-duv-violet text-white"
                  : "border-duv-line bg-white text-duv-plum hover:border-duv-violet"
              }`}
            >
              {lot === "1" ? "Showing wholesale lots only" : "Wholesale lots only"}
              <span className="opacity-60">{lotCount}</span>
            </Link>
          </div>
        )}

        <p className="mb-5 text-[13.5px] text-duv-muted">
          Showing {items.length} of {all.length} products
        </p>
        <ProductGrid items={items} />
      </div>
    </>
  );
}
