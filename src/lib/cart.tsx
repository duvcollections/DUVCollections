"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { site } from "@/lib/site";

export type CartLine = { sku: string; qty: number };

/** The slice of a product the cart needs. Kept small — this ships to the browser. */
export type CartProduct = {
  sku: string;
  slug: string;
  title: string;
  price: number;
  category: string;
  art: string;
};

type CartState = {
  catalog: CartProduct[];
  lines: CartLine[];
  ready: boolean;
  add: (sku: string, qty?: number) => void;
  setQty: (sku: string, qty: number) => void;
  remove: (sku: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  shipping: number;
  total: number;
  freeShippingGap: number;
};

const KEY = "duv.cart.v1";

/**
 * `SKU-A x2,SKU-B x1` in a URL, for the abandoned-cart email.
 *
 * Quantities are clamped and unknown SKUs are dropped by the caller, so a
 * hand-edited link can only ever produce a cart the shop would have allowed
 * anyway. Prices are never carried here — they are always looked up server-side
 * at checkout.
 */
export function encodeCart(lines: { sku: string; qty: number }[]): string {
  return lines.map((l) => `${l.sku}x${l.qty}`).join(",");
}

function parseRestore(raw: string): CartLine[] {
  const out: CartLine[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(",").slice(0, 40)) {
    const at = part.lastIndexOf("x");
    if (at < 1) continue;
    const sku = part.slice(0, at);
    const qty = Math.floor(Number(part.slice(at + 1)));
    if (!sku || seen.has(sku) || !Number.isFinite(qty) || qty < 1) continue;
    seen.add(sku);
    out.push({ sku, qty: Math.min(99, qty) });
  }
  return out;
}
const Ctx = createContext<CartState | null>(null);

export function CartProvider({
  catalog,
  children,
}: {
  /** Passed from the server layout so prices are current, not build-time. */
  catalog: CartProduct[];
  children: React.ReactNode;
}) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  // Restore on mount. localStorage cannot be read during render without breaking
  // hydration — the server has no cart — so this effect is the correct place for
  // it, and the setState below is deliberate. Wrapped in try/catch because
  // storage throws outright in some privacy modes.
  useEffect(() => {
    // An empty catalogue means the lookup failed, not that every saved line is
    // invalid. Filtering against it would drop the whole cart and the persist
    // effect below would then write the empty result back to storage — the
    // customer's basket gone for good because one query hiccuped.
    if (catalog.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see note above
      setReady(true);
      return;
    }
    // A `?restore=` parameter wins over stored state. It is how the
    // abandoned-cart email brings a basket back on a device that never had it —
    // the cart lives in localStorage, so a bare link to /cart would show an
    // empty basket to anyone reading their mail on a different machine.
    try {
      const restore = new URLSearchParams(window.location.search).get("restore");
      if (restore) {
        const fromLink = parseRestore(restore).filter((l) =>
          catalog.some((p) => p.sku === l.sku),
        );
        if (fromLink.length > 0) {
          setLines(fromLink);
          setReady(true);
          return;
        }
      }
    } catch {
      // Malformed parameter: fall through to whatever is in storage.
    }

    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setLines(
            parsed
              .filter((l) => l && typeof l.sku === "string" && Number.isFinite(l.qty))
              .map((l) => ({ sku: l.sku, qty: Math.max(1, Math.min(99, Math.floor(l.qty))) }))
              .filter((l) => catalog.some((p) => p.sku === l.sku)),
          );
        }
      }
    } catch {
      /* storage unavailable — cart simply starts empty */
    }
    setReady(true);
    // Mount only: re-running when `catalog` changes would clobber the live cart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* nothing we can do; the cart still works for this page view */
    }
  }, [lines, ready]);

  const add = useCallback((sku: string, qty = 1) => {
    setLines((prev) => {
      const found = prev.find((l) => l.sku === sku);
      if (found)
        return prev.map((l) =>
          l.sku === sku ? { ...l, qty: Math.min(99, l.qty + qty) } : l,
        );
      return [...prev, { sku, qty: Math.min(99, qty) }];
    });
  }, []);

  const setQty = useCallback((sku: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.sku !== sku)
        : prev.map((l) => (l.sku === sku ? { ...l, qty: Math.min(99, qty) } : l)),
    );
  }, []);

  const remove = useCallback(
    (sku: string) => setLines((prev) => prev.filter((l) => l.sku !== sku)),
    [],
  );

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartState>(() => {
    const count = lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = lines.reduce((n, l) => {
      const p = catalog.find((x) => x.sku === l.sku);
      return n + (p ? p.price * l.qty : 0);
    }, 0);
    const qualifies = subtotal >= site.policy.freeShippingThreshold;
    const shipping = count === 0 || qualifies ? 0 : site.policy.shippingFlatRate;
    return {
      catalog,
      lines,
      ready,
      add,
      setQty,
      remove,
      clear,
      count,
      subtotal,
      shipping,
      total: subtotal + shipping,
      freeShippingGap: Math.max(0, site.policy.freeShippingThreshold - subtotal),
    };
  }, [catalog, lines, ready, add, setQty, remove, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
