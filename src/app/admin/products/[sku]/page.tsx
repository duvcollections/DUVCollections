import Link from "next/link";
import { notFound } from "next/navigation";
import { bySku } from "@/lib/catalog";
import { ProductForm } from "../ProductForm";
import { isAdmin } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function EditProduct({ params }: { params: Promise<{ sku: string }> }) {
  // Defence in depth: the layout renders the sign-in notice, but without this
  // an unauthorised request would still run the queries below.
  if (!(await isAdmin())) return null;
  const { sku } = await params;
  const product = await bySku(decodeURIComponent(sku));
  if (!product) notFound();

  return (
    <>
      <Link href="/admin/products" className="text-[13.5px] font-semibold text-duv-violet hover:text-duv-pink">
        ← Products
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.025em]">{product.title}</h1>
        {product.archived && (
          <span className="rounded-full bg-duv-line px-3 py-1 text-[12.5px] font-bold text-duv-muted">Archived</span>
        )}
      </div>
      <p className="mt-2 font-mono text-[13px] text-duv-muted">
        {product.sku} ·{" "}
        <Link href={`/product/${product.slug}`} className="text-duv-violet hover:text-duv-pink">
          view on shop ↗
        </Link>
      </p>
      <div className="mt-8 max-w-3xl">
        <ProductForm product={product} />
      </div>
    </>
  );
}
