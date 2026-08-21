"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";

export function AddToCart({
  sku,
  size = "md",
  label = "Add to cart",
}: {
  sku: string;
  size?: "sm" | "md";
  label?: string;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        add(sku, 1);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1600);
      }}
      className={
        size === "sm"
          ? "w-full rounded-full bg-duv-plum px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-duv-violet"
          : "rounded-full bg-duv-pink px-8 py-4 text-[15px] font-bold text-white transition-colors hover:bg-duv-coral"
      }
    >
      {/* aria-live so screen-reader users hear the confirmation too */}
      <span aria-live="polite">{added ? "Added ✓" : label}</span>
    </button>
  );
}
