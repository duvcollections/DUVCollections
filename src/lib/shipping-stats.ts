import type { Order } from "@/lib/orders-admin";
import type { Product } from "@/lib/catalog";
import { weightForOrder } from "@/lib/shippo";
import { site } from "@/lib/site";

/**
 * Everything the shipping dashboard counts, worked out in one place.
 *
 * Kept out of the page so it can be tested without rendering React, and so the
 * numbers on the tiles and the numbers in the charts can never disagree — they
 * come from the same pass over the same orders.
 */

export type ShipProblem = {
  ref: string;
  id: string;
  kind: "no-address" | "no-weight" | "aging";
  detail: string;
};

export type DayBucket = { day: string; label: string; parcels: number };

export type CarrierSlice = { carrier: string; parcels: number; share: number };

export type ShippingStats = {
  waiting: Order[];
  inTransit: Order[];
  problems: ShipProblem[];
  shippedThisMonth: number;
  parcelsPerDay: DayBucket[];
  carriers: CarrierSlice[];
  medianHoursToShip: number | null;
  oldestWaitingHours: number | null;
};

const HOUR = 3_600_000;

/** Handling window in hours, read from the published policy rather than guessed. */
function handlingHours(): number {
  const days = Number((site.policy.handlingDays.match(/\d+/g) ?? ["2"]).pop());
  return (Number.isFinite(days) ? days : 2) * 24;
}

export function shippingStats(
  orders: Order[],
  products: Product[],
  nowMs: number,
): ShippingStats {
  const waiting = orders
    .filter((o) => o.status === "paid")
    .sort((a, b) => a.created - b.created); // oldest first — that's the queue order
  const shipped = orders.filter((o) => o.status === "shipped");

  /* ----------------------------------------------------------- problems */
  const problems: ShipProblem[] = [];
  const overdueAfter = handlingHours();

  for (const o of waiting) {
    if (!o.address?.line1) {
      problems.push({ ref: o.ref, id: o.id, kind: "no-address", detail: "No shipping address on the order." });
      continue;
    }
    if (weightForOrder(o, products) === null) {
      problems.push({
        ref: o.ref,
        id: o.id,
        kind: "no-weight",
        detail: "A SKU on this order isn't in the catalogue, so the weight can't be worked out.",
      });
    }
    const ageHours = (nowMs - o.created * 1000) / HOUR;
    if (ageHours > overdueAfter) {
      problems.push({
        ref: o.ref,
        id: o.id,
        kind: "aging",
        detail: `Paid ${Math.floor(ageHours / 24)} day(s) ago — past the ${site.policy.handlingDays} you promise.`,
      });
    }
  }

  /* ------------------------------------------------- parcels per day (14d) */
  const days: DayBucket[] = [];
  const dayMs = 24 * HOUR;
  for (let i = 13; i >= 0; i--) {
    const d = new Date(nowMs - i * dayMs);
    days.push({
      day: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      parcels: 0,
    });
  }
  const byDay = new Map(days.map((d) => [d.day, d]));

  for (const o of shipped) {
    // shipped_at is when the label was actually bought; fall back to the order
    // date for anything marked shipped before we recorded that.
    const when = o.shippedAt ? Date.parse(o.shippedAt) : o.created * 1000;
    if (!Number.isFinite(when)) continue;
    const bucket = byDay.get(new Date(when).toISOString().slice(0, 10));
    if (bucket) bucket.parcels++;
  }

  /* --------------------------------------------------------- carrier split */
  const counts = new Map<string, number>();
  for (const o of shipped) {
    const c = (o.carrier ?? "Unknown").trim() || "Unknown";
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const totalShipped = shipped.length;
  const carriers: CarrierSlice[] = [...counts.entries()]
    .map(([carrier, parcels]) => ({
      carrier,
      parcels,
      share: totalShipped ? parcels / totalShipped : 0,
    }))
    .sort((a, b) => b.parcels - a.parcels);

  /* ------------------------------------------------------------- timings */
  const turnarounds = shipped
    .filter((o) => o.shippedAt)
    .map((o) => (Date.parse(o.shippedAt!) - o.created * 1000) / HOUR)
    .filter((h) => Number.isFinite(h) && h >= 0)
    .sort((a, b) => a - b);

  const medianHoursToShip =
    turnarounds.length === 0
      ? null
      : turnarounds.length % 2
        ? turnarounds[(turnarounds.length - 1) / 2]
        : (turnarounds[turnarounds.length / 2 - 1] + turnarounds[turnarounds.length / 2]) / 2;

  const oldestWaitingHours =
    waiting.length === 0 ? null : (nowMs - waiting[0].created * 1000) / HOUR;

  /* ---------------------------------------------------------- this month */
  const monthStart = new Date(nowMs);
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const shippedThisMonth = shipped.filter((o) => {
    const when = o.shippedAt ? Date.parse(o.shippedAt) : o.created * 1000;
    return Number.isFinite(when) && when >= monthStart.getTime();
  }).length;

  return {
    waiting,
    inTransit: shipped.sort((a, b) => b.created - a.created),
    problems,
    shippedThisMonth,
    parcelsPerDay: days,
    carriers,
    medianHoursToShip,
    oldestWaitingHours,
  };
}

/** "3h" / "2d 4h" — short enough for a stat tile. */
export function humanHours(h: number | null): string {
  if (h === null) return "—";
  if (h < 1) return "<1h";
  if (h < 24) return `${Math.round(h)}h`;
  const d = Math.floor(h / 24);
  const rem = Math.round(h % 24);
  return rem ? `${d}d ${rem}h` : `${d}d`;
}
