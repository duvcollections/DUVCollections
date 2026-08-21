import Link from "next/link";
import { Logo } from "@/components/Mark";
import { categories } from "@/lib/catalog";
import { site } from "@/lib/site";

/**
 * Global 404 — deliberately self-contained.
 *
 * This lives outside the (shop) route group, because an unmatched URL has no
 * segment to inherit a layout from. It could import the real Header and Footer,
 * and the first version did — but Next serialises the not-found tree into the
 * RSC payload of *every* page, so that pulled the cart provider and the entire
 * catalogue onto the admin dashboard and every static page along with it.
 *
 * So this page brings a plain masthead instead: no cart, no client components,
 * no catalogue query. `categories` is a static constant, not a lookup.
 */
export default function NotFound() {
  return (
    <>
      <header className="border-b border-duv-line bg-duv-cream">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link href="/" aria-label={`${site.name} — home`}>
            <Logo />
          </Link>
          <Link
            href="/shop"
            className="rounded-full bg-duv-pink px-5 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-duv-coral"
          >
            Shop
          </Link>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-duv-pink">404</p>
        <h1 className="mt-3 max-w-[20ch] text-balance font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-5xl">
          That page isn&rsquo;t here
        </h1>
        <p className="mt-4 max-w-[62ch] text-[17px] leading-relaxed text-duv-muted">
          The link may be old, or the product may have sold out and been removed. Here is where
          most people were heading.
        </p>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        <p className="mt-10 text-[14.5px] text-duv-muted">
          Looking for an order?{" "}
          <Link
            href="/orders"
            className="font-bold text-duv-violet underline decoration-2 underline-offset-4 hover:text-duv-pink"
          >
            Track it here
          </Link>
          , or email{" "}
          <a
            href={`mailto:${site.contact.support}`}
            className="font-bold text-duv-violet underline decoration-2 underline-offset-4 hover:text-duv-pink"
          >
            {site.contact.support}
          </a>
          .
        </p>
      </main>
    </>
  );
}
