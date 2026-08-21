import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { AddToCart } from "@/components/AddToCart";
import { money } from "@/lib/site";
import type { Product } from "@/lib/catalog";
import { subcategoryLabels, availability } from "@/lib/catalog";

function Stock({ p }: { p: Product }) {
  const a = availability(p);
  if (a === "out-of-stock")
    return <span className="text-[12px] font-semibold text-duv-faint">Out of stock</span>;
  if (a === "low-stock")
    return (
      <span className="text-[12px] font-semibold text-duv-coral">
        Only {p.stock} left
      </span>
    );
  return <span className="text-[12px] font-semibold text-duv-green">In stock</span>;
}

export function ProductCard({ p }: { p: Product }) {
  return (
    <article className="lift group flex flex-col overflow-hidden rounded-2xl border border-duv-line bg-white">
      <Link href={`/product/${p.slug}`} className="block" tabIndex={-1} aria-hidden="true">
        <ProductImage
          sku={p.sku}
          category={p.category}
          art={p.art}
          title={p.title}
          className="aspect-square [container-type:inline-size]"
        />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-duv-faint">
          {subcategoryLabels[p.subcategory] ?? p.subcategory}
        </p>
        <h3 className="mt-1.5 text-[14.5px] font-bold leading-snug">
          <Link
            href={`/product/${p.slug}`}
            className="transition-colors after:absolute hover:text-duv-violet"
          >
            {p.title}
          </Link>
        </h3>
        <div className="mt-auto flex items-baseline gap-2 pt-3">
          <span className="font-display text-[19px] font-extrabold tabular-nums">
            {money(p.price)}
          </span>
          <Stock p={p} />
        </div>
        <div className="mt-3">
          <AddToCart sku={p.sku} size="sm" />
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ items }: { items: Product[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-duv-line bg-white p-10 text-center text-duv-muted">
        Nothing here yet.
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((p) => (
        <li key={p.sku} className="contents">
          <ProductCard p={p} />
        </li>
      ))}
    </ul>
  );
}
