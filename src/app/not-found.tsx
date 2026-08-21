import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { categories } from "@/lib/catalog";

export default function NotFound() {
  return (
    <>
      <PageHeader
        eyebrow="404"
        title="That page isn't here"
        lede="The link may be old, or the product may have sold out and been removed. Here is where most people were heading."
      />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/shop", label: "Everything we stock" },
            ...categories.map((c) => ({ href: `/shop/${c.id}`, label: c.name })),
          ].map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="lift block rounded-2xl border border-duv-line bg-white p-6 font-display text-[17px] font-extrabold tracking-[-0.02em] hover:text-duv-violet"
              >
                {l.label} <span aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
