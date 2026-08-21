"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Applies the `?sub=` / `?lot=1` filter in the browser. Renders nothing.
 *
 * Two constraints pull against each other here. Reading the query string on the
 * server makes the whole category route dynamic — a full React render inside
 * the Worker for every visit to /shop/jewelry. But `useSearchParams` bails its
 * entire Suspense subtree out to client-side rendering, so wrapping the product
 * grid in it would ship category pages with no products in the HTML at all,
 * which is exactly what a crawler would see.
 *
 * So the server renders every product and every chip into static HTML, and this
 * component — outside that markup, rendering nothing itself — hides what doesn't
 * match. The page stays prerendered, and the full catalogue stays in the source.
 */
export function CategoryFilter({ allCount }: { allCount: number }) {
  const params = useSearchParams();
  const sub = params.get("sub") ?? "";
  const lot = params.get("lot") === "1";

  useEffect(() => {
    let visible = 0;
    for (const li of document.querySelectorAll<HTMLElement>("#cat-grid li[data-sub]")) {
      const matches = (!sub || li.dataset.sub === sub) && (!lot || li.dataset.lot === "1");
      li.hidden = !matches;
      if (matches) visible++;
    }

    const active = "border-duv-plum bg-duv-plum text-white";
    const idle = "border-duv-line bg-white text-duv-plum hover:border-duv-violet";
    for (const chip of document.querySelectorAll<HTMLElement>("[data-chip-sub]")) {
      const on = (chip.dataset.chipSub ?? "") === sub;
      chip.className = `${chip.dataset.base ?? ""} ${on ? active : idle}`;
      if (on) chip.setAttribute("aria-current", "true");
      else chip.removeAttribute("aria-current");
    }

    const lotChip = document.querySelector<HTMLElement>("[data-chip-lot]");
    if (lotChip) {
      lotChip.className = `${lotChip.dataset.base ?? ""} ${
        lot ? "border-duv-violet bg-duv-violet text-white" : idle
      }`;
      const label = lotChip.querySelector("[data-lot-label]");
      if (label) label.textContent = lot ? "Showing wholesale lots only" : "Wholesale lots only";
    }

    const count = document.getElementById("cat-count");
    if (count) count.textContent = `Showing ${visible} of ${allCount} products`;

    const empty = document.getElementById("cat-empty");
    if (empty) empty.hidden = visible !== 0;
  }, [sub, lot, allCount]);

  return null;
}
