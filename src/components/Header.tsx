"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/Mark";
import { categories } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { site, money } from "@/lib/site";

const NAV = [
  ...categories.map((c) => ({ href: `/shop/${c.id}`, label: c.name })),
  { href: "/custom-printing", label: "Custom Printing" },
  { href: "/about", label: "About" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const { count, ready } = useCart();

  return (
    <>
      {/* Standing promise bar — shipping terms stated before anyone clicks a product */}
      <div className="bg-duv-plum text-white">
        <p className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-[12.5px] font-medium">
          <span>
            Free US shipping over {money(site.policy.freeShippingThreshold)}
          </span>
          <span aria-hidden="true" className="text-duv-faint">•</span>
          <span>Flat {money(site.policy.shippingFlatRate)} otherwise</span>
          <span aria-hidden="true" className="text-duv-faint">•</span>
          <span>{site.policy.returnWindowDays}-day returns</span>
        </p>
      </div>

      <header className="sticky top-0 z-50 border-b border-duv-line bg-duv-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3.5 sm:px-6">
          <Link href="/" className="shrink-0" aria-label="DUV Collections — home">
            <Logo />
          </Link>

          <nav
            className="ml-4 hidden items-center gap-1 lg:flex"
            aria-label="Product categories"
          >
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-full px-3.5 py-2 text-[14px] font-semibold text-duv-muted transition-colors hover:bg-white hover:text-duv-plum"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <form action="/search" role="search" className="ml-auto hidden max-w-xs flex-1 md:block">
            <label htmlFor="q-desktop" className="sr-only">
              Search products
            </label>
            <input
              id="q-desktop"
              name="q"
              type="search"
              placeholder="Search DTF film, chains, SKU…"
              className="w-full rounded-full border border-duv-line bg-white px-4 py-2.5 text-[14px] text-duv-plum placeholder:text-duv-faint focus:border-duv-violet focus:outline-none"
            />
          </form>

          <Link
            href="/cart"
            className="relative ml-auto shrink-0 rounded-full border border-duv-line bg-white px-4 py-2.5 text-[14px] font-bold text-duv-plum transition-colors hover:border-duv-violet md:ml-0"
          >
            Cart
            {ready && count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-duv-pink px-1 text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="shrink-0 rounded-full border border-duv-line bg-white px-4 py-2.5 text-[14px] font-bold text-duv-plum lg:hidden"
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>

        {open && (
          <div id="mobile-nav" className="border-t border-duv-line bg-white lg:hidden">
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
              <form action="/search" role="search" className="mb-3 md:hidden">
                <label htmlFor="q-mobile" className="sr-only">
                  Search products
                </label>
                <input
                  id="q-mobile"
                  name="q"
                  type="search"
                  placeholder="Search products…"
                  className="w-full rounded-full border border-duv-line bg-duv-cream px-4 py-3 text-[15px] focus:border-duv-violet focus:outline-none"
                />
              </form>
              <nav className="flex flex-col" aria-label="Product categories">
                {NAV.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="border-b border-duv-line py-3 text-[15px] font-semibold text-duv-plum last:border-0"
                  >
                    {n.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
