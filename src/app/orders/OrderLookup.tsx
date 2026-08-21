"use client";

import { useState } from "react";
import { money, site } from "@/lib/site";

type Found = {
  ref: string;
  placed: number;
  status: string;
  items: { title: string; qty: number }[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  carrier: string | null;
  tracking: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  city: string | null;
  state: string | null;
};

export function OrderLookup() {
  const [ref, setRef] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Found | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOrder(null);
    try {
      const res = await fetch("/api/order-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref, email }),
      });
      const d = (await res.json()) as {
        found?: boolean; order?: Found; message?: string; error?: string;
      };
      if (d.error) setError(d.error);
      else if (d.found && d.order) setOrder(d.order);
      else setError(d.message ?? "Not found.");
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  const input =
    "w-full rounded-full border border-duv-line bg-white px-5 py-3 text-[15px] focus:border-duv-violet focus:outline-none";

  return (
    <>
      <form onSubmit={submit} className="max-w-lg">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-bold text-duv-plum">Order reference</span>
            <input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="A1B2C3D4E5F6"
              className={`${input} font-mono uppercase`}
              required
            />
            <span className="mt-1.5 block text-[12.5px] text-duv-faint">
              The 12 characters shown on your order confirmation page and receipt.
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-bold text-duv-plum">Email address</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={input}
              required
            />
            <span className="mt-1.5 block text-[12.5px] text-duv-faint">
              The one you entered at checkout.
            </span>
          </label>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="mt-6 rounded-full bg-duv-pink px-8 py-3.5 text-[15px] font-bold text-white hover:bg-duv-coral disabled:bg-duv-faint"
        >
          {busy ? "Looking…" : "Find my order"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-6 max-w-lg rounded-2xl bg-duv-red/8 px-5 py-4 text-[14px] leading-relaxed text-duv-red">
          {error}
        </p>
      )}

      {order && (
        <div className="mt-8 max-w-2xl rounded-3xl border border-duv-line bg-white p-7">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-2xl font-extrabold tracking-tight">
              <span className="font-mono">{order.ref}</span>
            </h2>
            <span
              className={`rounded-full px-3 py-1 text-[12.5px] font-bold ${
                order.status === "shipped"
                  ? "bg-duv-mint/25 text-duv-green"
                  : "bg-duv-pink/12 text-duv-pink"
              }`}
            >
              {order.status === "shipped" ? "Shipped" : "Being packed"}
            </span>
          </div>
          <p className="mt-2 text-[13.5px] text-duv-muted">
            Placed {new Date(order.placed * 1000).toLocaleDateString("en-US", { dateStyle: "long" })}
            {order.city ? ` · shipping to ${order.city}, ${order.state}` : ""}
          </p>

          {order.status === "shipped" ? (
            <div className="mt-6 rounded-2xl bg-tint-printing p-5">
              <p className="text-[13px] font-bold uppercase tracking-wide text-duv-plum/60">
                {order.carrier} tracking
              </p>
              <p className="mt-1.5 break-all font-mono text-[16px] font-bold">{order.tracking}</p>
              {order.trackingUrl && (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block rounded-full bg-duv-plum px-6 py-3 text-[14px] font-bold text-white hover:bg-duv-violet"
                >
                  Track your parcel
                </a>
              )}
              <p className="mt-3 text-[12.5px] leading-relaxed text-duv-plum/70">
                Tracking can take a few hours to show its first scan. Delivery normally takes{" "}
                {site.policy.deliveryEstimate}.
              </p>
            </div>
          ) : (
            <p className="mt-6 rounded-2xl bg-tint-jewelry p-5 text-[14px] leading-relaxed text-duv-plum/80">
              We&rsquo;re packing this now. Orders leave us within {site.policy.handlingDays}, and
              you&rsquo;ll get a tracking number by email the moment the label is bought.
            </p>
          )}

          <ul className="mt-6 divide-y divide-duv-line border-t border-duv-line">
            {order.items.map((i, n) => (
              <li key={n} className="flex items-baseline justify-between gap-4 py-3 text-[14.5px]">
                <span>{i.title}</span>
                <span className="shrink-0 font-mono font-bold">&times;{i.qty}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-1.5 border-t border-duv-line pt-4 text-[14px]">
            <div className="flex justify-between"><dt className="text-duv-muted">Subtotal</dt><dd className="tabular-nums">{money(order.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-duv-muted">Shipping</dt><dd className="tabular-nums">{order.shipping === 0 ? "Free" : money(order.shipping)}</dd></div>
            <div className="flex justify-between"><dt className="text-duv-muted">Sales tax</dt><dd className="tabular-nums">{money(order.tax)}</dd></div>
            <div className="flex justify-between border-t border-duv-line pt-2.5 font-bold"><dt>Total paid</dt><dd className="font-display tabular-nums">{money(order.total)}</dd></div>
          </dl>

          <p className="mt-5 text-[13px] leading-relaxed text-duv-muted">
            Something wrong? Email{" "}
            <a className="font-semibold text-duv-violet underline underline-offset-2" href={`mailto:${site.contact.support}`}>
              {site.contact.support}
            </a>{" "}
            quoting {order.ref}.
          </p>
        </div>
      )}
    </>
  );
}
