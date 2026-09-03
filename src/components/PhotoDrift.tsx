"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

/**
 * A collage of real product photographs that drifts gently as the page scrolls.
 *
 * The photos are chosen on the server and passed in, so this component never
 * decides *what* to show — only how it moves. That keeps the data-fetching in
 * the server component where it belongs and this island small.
 *
 * Performance notes, because a scroll handler on a hero is easy to get wrong:
 *
 * 1. **The listener only exists while the collage is near the viewport.** An
 *    IntersectionObserver attaches and detaches it, so scrolling the rest of a
 *    long page costs nothing.
 *
 * 2. **Writes are batched into requestAnimationFrame.** A scroll event can fire
 *    dozens of times per frame; setting `transform` on every one of them is how
 *    a page starts dropping frames. One write per frame, at most.
 *
 * 3. **Only `transform` is animated** — never `top` or `margin`, which force
 *    layout on every frame. Transform is composited, so the work happens off
 *    the main thread.
 *
 * 4. **`prefers-reduced-motion` disables it outright.** Parallax is the single
 *    most reliable trigger for vestibular discomfort on the web; for those
 *    visitors this is a plain static collage.
 */

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export type DriftPhoto = { src: string; alt: string };

export function PhotoDrift({ photos }: { photos: DriftPhoto[] }) {
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const root = wrap.current;
    if (!root) return;

    const tiles = [...root.querySelectorAll<HTMLElement>("[data-depth]")];
    if (tiles.length === 0) return;

    let raf = 0;
    let listening = false;

    const apply = () => {
      raf = 0;
      const mid = window.innerHeight / 2;
      const offset = (root.getBoundingClientRect().top - mid) / mid;
      for (const tile of tiles) {
        const depth = Number(tile.dataset.depth ?? 0);
        // Small numbers on purpose: this should read as depth, not as motion.
        tile.style.transform = `translate3d(0, ${(offset * depth * 22).toFixed(2)}px, 0)`;
      }
    };

    const onScroll = () => {
      if (raf === 0) raf = requestAnimationFrame(apply);
    };

    // Attach the scroll listener only while the collage is actually on screen.
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        if (visible && !listening) {
          window.addEventListener("scroll", onScroll, { passive: true });
          listening = true;
          onScroll();
        } else if (!visible && listening) {
          window.removeEventListener("scroll", onScroll);
          listening = false;
        }
      },
      { rootMargin: "120px" },
    );

    io.observe(root);
    return () => {
      io.disconnect();
      if (listening) window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  if (photos.length === 0) return null;

  // Fixed layout rather than random: a hero that reshuffles on every request
  // is impossible to art-direct and looks different in every screenshot.
  //
  // FOUR columns, not three. The lead tile spans 2x2 = 4 cells, and the other
  // four take one each — eight cells, which is exactly 4x2. On a three-column
  // grid the last two tiles had nowhere to sit and wrapped onto a third row.
  const layout = [
    "col-span-2 row-span-2",
    "col-span-1 row-span-1",
    "col-span-1 row-span-1",
    "col-span-1 row-span-1",
    "col-span-1 row-span-1",
  ];
  const depths = [0.35, -0.6, 0.8, -0.4, 0.55];

  // The explicit height is load-bearing. Every tile's image uses `fill`, which
  // is absolutely positioned and therefore contributes NO height of its own —
  // without a height here the rows collapse to zero and the whole collage
  // renders as a set of hairlines. Caught in a screenshot, not in review.
  return (
    <div ref={wrap} className="grid h-[420px] grid-cols-4 grid-rows-2 gap-3">
      {photos.slice(0, 5).map((p, i) => (
        <div
          key={p.src}
          data-depth={depths[i] ?? 0}
          className={`${layout[i] ?? "col-span-1"} relative overflow-hidden rounded-2xl bg-white ring-1 ring-duv-line will-change-transform`}
        >
          <Image
            src={p.src}
            alt={p.alt}
            fill
            sizes="(max-width: 1024px) 45vw, 280px"
            className="object-cover"
            // The first tile is large and above the fold on desktop.
            priority={i === 0}
          />
        </div>
      ))}
    </div>
  );
}
