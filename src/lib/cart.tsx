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
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- see note above
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
