import type { Order } from "@/lib/orders-admin";
import type { Product } from "@/lib/catalog";
import { detectCarrier } from "@/lib/carrier";

/**
 * CSV round-trip with Pirate Ship.
 *
 * Pirate Ship is free — no monthly fee, no per-label fee, no markup on postage —
 * but it has no API, by their own deliberate choice. What it does have is a
 * spreadsheet importer and a tracking export. So the automation is a round
 * trip: export the orders that need labels, buy them there, bring the tracking
 * numbers back.
 *
 * That takes the per-order work from "retype an address, then retype a tracking
 * number" down to two file moves for the whole day's orders, at no cost and at
 * any volume. It is not as slick as an API, and it is honest about that.
 */

/** Excel opens a bare CSV in the local encoding and mangles anything accented. */
export const UTF8_BOM = "﻿";

const escape = (v: string | number | null | undefined): string => {
  const s = String(v ?? "");
  // A comma, quote or newline inside a field would otherwise shift every
  // column after it — which is how an address ends up in the weight field.
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = (rows: (string | number | null)[][]): string =>
  UTF8_BOM + rows.map((r) => r.map(escape).join(",")).join("\r\n") + "\r\n";

const HEADERS = [
  "Order ID",
  "Name",
  "Email",
  "Address 1",
  "Address 2",
  "City",
  "State",
  "Zip",
  "Country",
  "Weight (oz)",
  "Items",
] as const;

/**
 * One row per order that still needs a label.
 *
 * Weight comes from the SKUs recorded at checkout, plus an ounce for packaging.
 * If a SKU is missing from the catalogue the weight is left blank rather than
 * guessed — an understated weight is postage due at the far end, which the
 * customer finds out about, not you.
 */
export function unshippedToCsv(orders: Order[], products: Product[]): string {
  const weightBySku = new Map(products.map((p) => [p.sku, p.shipWeightOz]));

  const rows: (string | number | null)[][] = [[...HEADERS]];

  for (const o of orders) {
    const a = o.address;
    let weight: number | null = 1; // packaging
    for (const line of o.skus) {
      const each = weightBySku.get(line.sku);
      if (each === undefined) {
        weight = null;
        break;
      }
      weight += each * line.qty;
    }
    // No SKU metadata at all means an order placed before we recorded it.
    if (o.skus.length === 0) weight = null;

    rows.push([
      o.ref,
      o.name ?? "",
      o.email ?? "",
      a?.line1 ?? "",
      a?.line2 ?? "",
      a?.city ?? "",
      a?.state ?? "",
      a?.postal_code ?? "",
      a?.country ?? "US",
      weight === null ? "" : Math.ceil(weight),
      o.items.map((i) => `${i.title} x${i.qty}`).join("; "),
    ]);
  }

  return toCsv(rows);
}

/* ------------------------------------------------------------------ import */

export type TrackingRow = {
  ref: string;
  tracking: string;
  carrier: string | null;
  /** 1-based row number in the pasted text, for error messages. */
  line: number;
};

export type ParseResult = {
  rows: TrackingRow[];
  problems: { line: number; text: string; reason: string }[];
};

/**
 * Parse whatever Pirate Ship (or a spreadsheet) hands back.
 *
 * Header row first, shape second. That order matters: a 12-digit FedEx tracking
 * number is character-for-character the same shape as our 12-character order
 * reference, so shape alone genuinely cannot tell them apart. When the file has
 * headers — and every carrier export does — we read the columns and stop
 * guessing. Only a headerless paste falls back to shape, and there we take the
 * left-most reference and the next usable cell, which is the layout of the file
 * we hand out in the first place.
 *
 * A row that can't be read with confidence goes to `problems` and is reported.
 * It is never silently skipped: a skipped row is a customer who paid and never
 * got a tracking email.
 */
export function parseTrackingCsv(text: string): ParseResult {
  const rows: TrackingRow[] = [];
  const problems: ParseResult["problems"] = [];
  const seen = new Set<string>();

  const lines = text.split(/\r?\n/);
  let cols: { ref: number; tracking: number; carrier: number } | null = null;

  lines.forEach((raw, i) => {
    const line = i + 1;
    const trimmed = raw.trim();
    if (!trimmed) return;

    const cells = splitRow(trimmed).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cells.length < 2) {
      problems.push({ line, text: trimmed, reason: "Needs at least a reference and a tracking number." });
      return;
    }

    // A header row is consumed, not reported, and teaches us the column layout.
    if (cols === null) {
      const header = readHeader(cells);
      if (header) {
        cols = header;
        return;
      }
    }

    const found = cols ? byColumn(cells, cols) : byShape(cells);
    if ("reason" in found) {
      problems.push({ line, text: trimmed, reason: found.reason });
      return;
    }

    const key = found.ref.toUpperCase();
    if (seen.has(key)) {
      problems.push({ line, text: trimmed, reason: `${key} appears more than once — only the first was used.` });
      return;
    }
    seen.add(key);

    rows.push({
      ref: key,
      tracking: found.tracking,
      carrier: found.carrier ? normaliseCarrier(found.carrier) : detectCarrier(found.tracking),
      line,
    });
  });

  return { rows, problems };
}

type Found = { ref: string; tracking: string; carrier: string | null } | { reason: string };

/** Column indices from a header row, or null when this isn't one. */
function readHeader(cells: string[]): { ref: number; tracking: number; carrier: number } | null {
  const norm = cells.map((c) => c.toLowerCase().replace(/[^a-z]/g, ""));
  const find = (...names: string[]) => norm.findIndex((c) => c !== "" && names.some((n) => c.includes(n)));

  const tracking = find("tracking", "trackingnumber");
  const ref = find("orderid", "order", "reference", "ref");
  if (tracking === -1 || ref === -1 || tracking === ref) return null;

  // Guard against a data row that happens to contain the word "order".
  if (cells.some(looksLikeTrackingNumber)) return null;

  return { ref, tracking, carrier: find("carrier", "service", "provider") };
}

function byColumn(cells: string[], cols: { ref: number; tracking: number; carrier: number }): Found {
  const ref = (cells[cols.ref] ?? "").replace(/\s/g, "");
  const tracking = (cells[cols.tracking] ?? "").replace(/[\s-]/g, "");
  if (!isRefShaped(ref)) {
    return { reason: `The order column held "${cells[cols.ref] ?? ""}", which isn't a 12-character reference.` };
  }
  if (tracking.length < 8) {
    return { reason: `No tracking number in the tracking column for ${ref}.` };
  }
  const carrier = cols.carrier >= 0 ? (cells[cols.carrier] ?? "") : "";
  return { ref, tracking, carrier: /^(usps|ups|fedex|dhl)$/i.test(carrier) ? carrier : null };
}

/** Headerless fallback: left-most reference, then the next usable cell. */
function byShape(cells: string[]): Found {
  const refIndex = cells.findIndex((c) => isRefShaped(c.replace(/\s/g, "")));
  if (refIndex === -1) {
    return { reason: "Couldn't find a 12-character order reference in this row." };
  }
  const ref = cells[refIndex].replace(/\s/g, "");

  // Prefer something unmistakably a tracking number; otherwise any other cell
  // long enough to be one. Excluding the reference cell by index is what stops
  // a 12-digit FedEx number being mistaken for the reference.
  const candidates = cells
    .map((c, i) => ({ value: c.replace(/[\s-]/g, ""), i }))
    .filter((c) => c.i !== refIndex && c.value.length >= 8 && /^[0-9A-Za-z]+$/.test(c.value));

  const best =
    candidates.find((c) => looksLikeTrackingNumber(c.value)) ??
    candidates.find((c) => /^[0-9]+$/.test(c.value) || /^1Z/i.test(c.value));

  if (!best) return { reason: `Found reference ${ref} but no tracking number beside it.` };

  const carrier = cells.find((c) => /^(usps|ups|fedex|dhl)$/i.test(c.trim()));
  return { ref, tracking: best.value, carrier: carrier ?? null };
}

/** Split on comma or tab, respecting quoted fields. */
function splitRow(row: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (quoted && row[i + 1] === '"') { cur += '"'; i++; }
      else quoted = !quoted;
    } else if ((ch === "," || ch === "\t") && !quoted) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/** Our reference is exactly 12 alphanumeric characters. */
const isRefShaped = (c: string) => /^[A-Za-z0-9]{12}$/.test(c);

/**
 * Unmistakably a tracking number — long enough or distinctive enough that it
 * cannot be confused with our 12-character reference.
 */
function looksLikeTrackingNumber(c: string): boolean {
  const t = c.replace(/[\s-]/g, "");
  if (/^1Z[0-9A-Za-z]{16}$/i.test(t)) return true;
  if (/^[A-Za-z]{2}[0-9]{9}[A-Za-z]{2}$/.test(t)) return true;
  if (/^[0-9]+$/.test(t) && t.length >= 13 && t.length <= 40) return true;
  return false;
}

const normaliseCarrier = (c: string): string => {
  const k = c.toLowerCase();
  if (k === "usps") return "USPS";
  if (k === "ups") return "UPS";
  if (k === "fedex") return "FedEx";
  if (k === "dhl") return "DHL";
  return c;
};
