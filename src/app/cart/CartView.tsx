"use client";

import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { products } from "@/lib/catalog";
import { site, money } from "@/lib/site";

export function CartView({ cancelled = false }: { cancelled?: boolean }) {
  const { lines, ready, setQty, remove, subtotal, shipping, total, freeShippingGap, count } =
    useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: lines.map((l) => ({ sku: l.sku, qty: l.qty })) }),
      });

      // Parse defensively. If the endpoint is missing or misconfigured the body
      // is an HTML error page, not JSON — and reporting that as "check your
      // connection" sends everyone hunting for the wrong problem.
      let data: { url?: string; error?: string } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        setError(
          `Checkout is misconfigured (server said ${res.status}). Please email us and we'll take your order directly.`,
        );
        setBusy(false);
        return;
      }

      if (!res.ok || !data.url) {
        setError(data.error ?? `Something went wrong (${res.status}). Please try again.`);
        setBusy(false);
        return;
      }

      // Hand off to Stripe's hosted page. Card details never touch our servers.
      window.location.href = data.url;
    } catch {
      setError("We couldn't reach the payment service. Check your connection and try again.");
      setBusy(false);
    }
  }

  if (!ready) {
    return <p className="py-16 text-center text-duv-muted">Loading your cart…</p>;
  }

  if (count === 0) {
    return (
      <div className="rounded-3xl border border-duv-line bg-white p-14 text-center">
        <p className="font-display text-2xl font-extrabold">Your cart is empty</p>
        <p className="mx-auto mt-2 max-w-[42ch] text-[15px] text-duv-muted">
          Nothing added yet. Have a look at the printing supplies or the jewelry shelves.
        </p>
        <Link
          href="/shop"
          className="mt-7 inline-block rounded-full bg-duv-pink px-8 py-4 text-[15px] font-bold text-white hover:bg-duv-coral"
        >
          Browse the catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
      <ul className="divide-y divide-duv-line rounded-3xl border border-duv-line bg-white">
        {lines.map((l) => {
          const p = products.find((x) => x.sku === l.sku);
          if (!p) return null;
          return (
            <li key={l.sku} className="flex gap-4 p-4 sm:gap-5 sm:p-5">
              <Link href={`/product/${p.slug}`} className="shrink-0">
                <ProductImage
                  sku={p.sku}
                  category={p.category}
                  art={p.art}
                  title={p.title}
                  compact
                  className="h-24 w-24 rounded-xl sm:h-28 sm:w-28"
                />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <h2 className="text-[14.5px] font-bold leading-snug">
                  <Link href={`/product/${p.slug}`} className="hover:text-duv-violet">
                    {p.title}
                  </Link>
                </h2>
                <p className="mt-1 text-[12.5px] text-duv-faint">SKU {p.sku}</p>
                <div className="mt-auto flex flex-wrap items-center gap-4 pt-3">
                  <div className="flex items-center gap-1 rounded-full border border-duv-line">
                    <button
                      type="button"
                      onClick={() => setQty(l.sku, l.qty - 1)}
                      aria-label={`Decrease quantity of ${p.title}`}
                      className="h-9 w-9 rounded-full text-[17px] font-bold text-duv-muted hover:text-duv-plum"
                    >
                      −
                    </button>
                    <span className="min-w-7 text-center text-[14px] font-bold tabular-nums">
                      {l.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty(l.sku, l.qty + 1)}
                      aria-label={`Increase quantity of ${p.title}`}
                      className="h-9 w-9 rounded-full text-[17px] font-bold text-duv-muted hover:text-duv-plum"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(l.sku)}
                    className="text-[13px] font-semibold text-duv-muted underline underline-offset-2 hover:text-duv-red"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <p className="shrink-0 font-display text-[17px] font-extrabold tabular-nums">
                {money(p.price * l.qty)}
              </p>
            </li>
          );
        })}
      </ul>

      <aside className="rounded-3xl border border-duv-line bg-white p-6 lg:sticky lg:top-28">
        <h2 className="font-display text-xl font-extrabold">Order summary</h2>

        {freeShippingGap > 0 && (
          <p className="mt-4 rounded-xl bg-tint-printing px-4 py-3 text-[13px] font-semibold text-duv-plum">
            Add {money(freeShippingGap)} more for free shipping.
          </p>
        )}

        <dl className="mt-5 space-y-2.5 text-[14.5px]">
          <div className="flex justify-between">
            <dt className="text-duv-muted">Subtotal</dt>
            <dd className="font-semibold tabular-nums">{money(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-duv-muted">Shipping</dt>
            <dd className="font-semibold tabular-nums">
              {shipping === 0 ? <span className="text-duv-green">Free</span> : money(shipping)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-duv-muted">Sales tax</dt>
            <dd className="text-[13px] text-duv-faint">Calculated at checkout</dd>
          </div>
          <div className="flex justify-between border-t border-duv-line pt-3.5 text-[17px]">
            <dt className="font-bold">Total</dt>
            <dd className="font-display font-extrabold tabular-nums">{money(total)}</dd>
          </div>
        </dl>

        {cancelled && !error && (
          <p className="mt-5 rounded-xl bg-tint-jewelry px-4 py-3 text-[13px] text-duv-plum">
            Checkout was cancelled — nothing was charged and your cart is still here.
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-duv-red/10 px-4 py-3 text-[13px] font-semibold text-duv-red"
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={checkout}
          disabled={busy}
          className="mt-6 w-full rounded-full bg-duv-pink px-6 py-4 text-[15px] font-bold text-white transition-colors hover:bg-duv-coral disabled:cursor-wait disabled:bg-duv-faint"
        >
          {busy ? "Taking you to checkout…" : "Checkout securely"}
        </button>

        <p className="mt-3 text-center text-[12.5px] leading-relaxed text-duv-muted">
          Payment is handled by Stripe. Your card details go straight to them and never
          touch our servers. Sales tax is calculated from your delivery address on the
          next screen.
        </p>
        <p className="mt-2 text-center text-[12.5px] text-duv-muted">
          Prefer an invoice?{" "}
          <a
            className="font-semibold text-duv-violet underline underline-offset-2"
            href={`mailto:${site.contact.sales}`}
          >
            Email {site.contact.sales}
          </a>
        </p>
      </aside>
    </div>
  );
}
