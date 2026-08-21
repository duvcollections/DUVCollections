import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ProductGrid } from "@/components/ProductCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { products, categories, byCategory } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Shop all products",
  description:
    "The full DUV Collections catalogue — DTF supplies, heat transfer paper, gold-plated jewelry and sunglasses.",
};

export default function ShopAll() {
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
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/shop/${c.id}`}
              className="rounded-full border border-duv-line bg-white px-4 py-2 text-[13.5px] font-semibold text-duv-plum transition-colors hover:border-duv-violet hover:text-duv-violet"
            >
              {c.name}
              <span className="ml-1.5 text-duv-faint">{byCategory(c.id).length}</span>
            </Link>
          ))}
        </div>

        <ProductGrid items={products} />
      </div>
    </>
  );
}
