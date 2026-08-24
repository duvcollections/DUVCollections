"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/components/Analytics";

/**
 * Fires one analytics event when a page is first shown.
 *
 * A client island rather than something in the page itself, so a product page
 * stays a server component and keeps its prerendered HTML. The alternative —
 * making the whole route a client component to fire one event — would trade
 * the shop's SEO for a metric.
 *
 * The ref guard matters more than it looks: React runs effects twice in
 * development Strict Mode, and without it every funnel number would be double
 * counted in a way that looks plausible rather than obviously broken.
 */
export function TrackView({
  event,
  props,
}: {
  event: string;
  props?: Record<string, string | number | boolean>;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackEvent(event, props);
    // Deliberately empty: this is "on mount", and re-firing when a prop object
    // is recreated on re-render would inflate the counts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
