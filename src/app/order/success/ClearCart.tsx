"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart";

/**
 * Empties the cart once payment has succeeded.
 *
 * Deliberately runs only on this page, which is reachable only after Stripe
 * redirects back from a completed session — so a cart is never lost because
 * someone backed out of checkout.
 */
export function ClearCart() {
  const { clear, ready, count } = useCart();
  useEffect(() => {
    if (ready && count > 0) clear();
  }, [ready, count, clear]);
  return null;
}
