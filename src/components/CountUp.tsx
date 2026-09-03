"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A number that counts up once, when it first scrolls into view.
 *
 * Built on the same principles as `Reveal`, for the same reasons:
 *
 * 1. **The final value is what renders on the server.** The count-up is applied
 *    by an effect, so a crawler — or a visitor whose JavaScript failed — sees
 *    "1,900+", not "0". Animating up from zero in the initial HTML would mean
 *    Google indexes a page claiming zero orders.
 *
 * 2. **`prefers-reduced-motion` skips the animation entirely.** Numbers ticking
 *    upward are exactly the kind of motion that triggers vestibular symptoms,
 *    so for those visitors the figure is simply present from the start.
 *
 * 3. **It fires once and disconnects.** Re-counting every time the section
 *    scrolls past is a gimmick, not a feature.
 *
 * The easing is deliberately front-loaded (cubic ease-out): most of the
 * distance is covered early, so the number reads as settling into place rather
 * than crawling. A linear count feels broken at the tail.
 */

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function CountUp({
  /** The real figure. Rendered as-is on the server and at rest. */
  value,
  /** Text before/after the number, e.g. "$" or "%". Never animated. */
  prefix = "",
  suffix = "",
  /** Milliseconds for the whole count. Keep under ~1.2s. */
  duration = 1400,
  className = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  // Starts at the true value so SSR and hydration agree; the effect decides
  // whether to rewind and animate. Same reasoning as Reveal's `armed` flag.
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const el = ref.current;
    if (!el) return;

    // Already on screen at mount: leave it alone rather than snapping to zero
    // in front of someone who is looking straight at it.
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    setShown(0);

    let raf = 0;
    let start: number | null = null;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();

        const step = (now: number) => {
          start ??= now;
          const t = Math.min(1, (now - start) / duration);
          // Ease-out cubic: fast first, settling at the end.
          const eased = 1 - Math.pow(1 - t, 3);
          setShown(Math.round(value * eased));
          if (t < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );

    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {shown.toLocaleString("en-US")}
      {suffix}
    </span>
  );
}
