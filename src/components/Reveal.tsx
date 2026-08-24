"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reveals its children as they scroll into view.
 *
 * Built on IntersectionObserver rather than a scroll listener: the browser does
 * the work off the main thread, so a page full of these still scrolls smoothly
 * where a `scroll` handler recalculating positions would not.
 *
 * Three things this deliberately gets right:
 *
 * 1. **Content is visible without JavaScript.** The hidden state is applied by
 *    the effect, so a crawler — or a browser where the script failed — sees the
 *    finished page. Animating from `opacity: 0` in CSS would hide the entire
 *    shop from Google the moment the bundle failed to load.
 *
 * 2. **`prefers-reduced-motion` is honoured.** Motion is a real accessibility
 *    problem for people with vestibular disorders, so for them this becomes a
 *    plain instant render rather than a slightly gentler animation. That check
 *    happens in the *initialiser*, not the effect body: setting state
 *    synchronously inside an effect costs an extra render pass for a value that
 *    was knowable before the first one.
 *
 * 3. **It fires once and disconnects.** Re-animating on every scroll past is
 *    what makes a page feel cheap, and it keeps observers alive for no reason.
 */

/** True when the visitor has asked their OS to reduce motion. */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function Reveal({
  children,
  /** Stagger within a group, in milliseconds. Keep the total under ~300. */
  delay = 0,
  /** Distance travelled while fading in. */
  y = 16,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // `armed` cannot be decided in a lazy initialiser.
  //
  // The initialiser runs during hydration too, where it must return exactly
  // what the server returned or React discards the markup. The server has no
  // `window`, so it always yields false — and a first attempt at this left
  // every element permanently un-armed and nothing ever animated. Which is a
  // safe failure (the page just doesn't move) but not the intended one.
  //
  // So: render the finished state first, exactly as the server did, then arm
  // in an effect. `armed` and `shown` are set together in one pass, so this
  // costs a single extra render rather than a cascade.
  const [state, setState] = useState<{ armed: boolean; shown: boolean }>({
    armed: false,
    shown: false,
  });
  const { armed, shown } = state;
  const setShown = (v: boolean) => setState((s) => ({ ...s, shown: v }));

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const el = ref.current;
    if (!el) return;

    // Anything already on screen at mount stays visible: hiding it now would
    // make the page flash blank in front of a reader who is already looking.
    const onScreen = el.getBoundingClientRect().top < window.innerHeight;
    if (onScreen) return;

    setState({ armed: true, shown: false });

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      // Start slightly before the element reaches the viewport, so the motion
      // finishes as it arrives rather than starting once it is already read.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  const hidden = armed && !shown;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: hidden ? 0 : 1,
        transform: hidden ? `translateY(${y}px)` : "none",
        transition: armed
          ? `opacity 620ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 620ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`
          : undefined,
        // Only promote to its own layer while it is actually moving.
        willChange: hidden ? "opacity, transform" : undefined,
      }}
    >
      {children}
    </div>
  );
}
