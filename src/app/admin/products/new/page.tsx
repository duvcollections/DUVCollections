import Link from "next/link";
import { ProductForm } from "../ProductForm";

export const dynamic = "force-dynamic";

export default function NewProduct() {
  return (
    <>
      <Link href="/admin/products" className="text-[13.5px] font-semibold text-duv-violet hover:text-duv-pink">
        ← Products
      </Link>
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.025em]">Add a product</h1>
      <p className="mt-2 max-w-[60ch] text-[14.5px] text-duv-muted">
        It goes live on the shop as soon as you save. The page URL is generated from the title.
      </p>
      <div className="mt-8 max-w-3xl">
        <ProductForm />
      </div>
    </>
  );
}
