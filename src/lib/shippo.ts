import { secret } from "@/lib/stripe";
import { site } from "@/lib/site";
import type { Order } from "@/lib/orders-admin";
import type { Product } from "@/lib/catalog";

/**
 * Shippo — live rates and label purchase.
 *
 * Everything here is written against Shippo's documented shapes, and every
 * failure carries Shippo's own message through to the screen rather than a
 * house-style "something went wrong". When you are spending real money on a
 * label, the difference between "couldn't buy label" and "address_to.zip is
 * not a valid ZIP for CA" is the difference between a fix and a support ticket.
 *
 * No key configured means no rates and no labels — the CSV round trip with
 * Pirate Ship keeps working untouched. That is deliberate: the free path must
 * never depend on the paid one being set up.
 */

const BASE = "https://api.goshippo.com";

export type ShippoRate = {
  id: string;
  carrier: string;
  service: string;
  amount: number;
  currency: string;
  estimatedDays: number | null;
  /** Shippo's own "cheapest"/"fastest" flags, when present. */
  attributes: string[];
};

export type BoughtLabel = {
  transactionId: string;
  tracking: string;
  carrier: string;
  labelUrl: string | null;
  trackingUrl: string | null;
  amount: number;
};

export type Parcel = {
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  weightOz: number;
};

/** Sensible boxes, so the common case is one click rather than four fields. */
export const PARCEL_PRESETS: { id: string; label: string; parcel: Omit<Parcel, "weightOz"> }[] = [
  { id: "poly-small", label: "Small poly mailer", parcel: { lengthIn: 10, widthIn: 7, heightIn: 1 } },
  { id: "poly-large", label: "Large poly mailer", parcel: { lengthIn: 14, widthIn: 11, heightIn: 2 } },
  { id: "box-small", label: "Small box", parcel: { lengthIn: 9, widthIn: 6, heightIn: 4 } },
  { id: "box-medium", label: "Medium box", parcel: { lengthIn: 12, widthIn: 10, heightIn: 6 } },
  { id: "tube", label: "Film roll tube", parcel: { lengthIn: 40, widthIn: 5, heightIn: 5 } },
];

export class ShippoError extends Error {}

export async function shippoKey(): Promise<string | null> {
  try {
    const k = (await secret("SHIPPO_API_KEY")).trim();
    return k || null;
  } catch {
    return null;
  }
}

export async function shippoConfigured(): Promise<boolean> {
  return (await shippoKey()) !== null;
}

/** True when the key is a test key, so the UI can say so out loud. */
export const isTestKey = (key: string) => key.startsWith("shippo_test_");

async function call<T>(path: string, init: RequestInit & { key: string }): Promise<T> {
  const { key, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...rest,
      headers: {
        Authorization: `ShippoToken ${key}`,
        "Content-Type": "application/json",
        ...(rest.headers ?? {}),
      },
    });
  } catch (err) {
    throw new ShippoError(`Couldn't reach Shippo: ${(err as Error).message}`);
  }

  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new ShippoError(`Shippo returned something that wasn't JSON (${res.status}).`);
  }

  if (!res.ok) throw new ShippoError(describe(body, res.status));
  return body as T;
}

/**
 * Turn Shippo's error shapes into one sentence a human can act on.
 * It returns field errors as a nested object, a `detail` string, or a
 * `messages` array depending on the endpoint — all three appear in practice.
 */
function describe(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (typeof b.detail === "string") return b.detail;

    if (Array.isArray(b.messages)) {
      const msgs = b.messages
        .map((m) => (typeof m === "object" && m ? String((m as Record<string, unknown>).text ?? "") : String(m)))
        .filter(Boolean);
      if (msgs.length) return msgs.join(" · ");
    }

    // Field errors: { "address_to": { "zip": ["Enter a valid ZIP."] } }
    const parts: string[] = [];
    for (const [field, value] of Object.entries(b)) {
      const flat = flatten(value);
      if (flat) parts.push(`${field}: ${flat}`);
    }
    if (parts.length) return parts.join(" · ");
  }
  return `Shippo returned ${status}.`;
}

function flatten(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(flatten).filter(Boolean).join(", ");
  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([k, v]) => `${k} ${flatten(v)}`)
      .filter(Boolean)
      .join(", ");
  }
  return "";
}

/* ------------------------------------------------------------------ parcels */

/**
 * Parcel weight from what was actually bought, plus packaging.
 *
 * Returns null when a SKU isn't in the catalogue — the caller then asks a human
 * rather than guessing. An understated weight is postage due at the customer's
 * door, which they find out about and you don't.
 */
export function weightForOrder(order: Order, products: Product[]): number | null {
  if (order.skus.length === 0) return null;
  const bySku = new Map(products.map((p) => [p.sku, p.shipWeightOz]));
  let oz = 1; // packaging
  for (const line of order.skus) {
    const each = bySku.get(line.sku);
    if (each === undefined) return null;
    oz += each * line.qty;
  }
  return Math.ceil(oz);
}

/** Pick a box that fits the weight, as an opening suggestion. */
export function suggestParcel(weightOz: number): (typeof PARCEL_PRESETS)[number] {
  if (weightOz <= 12) return PARCEL_PRESETS[0];
  if (weightOz <= 32) return PARCEL_PRESETS[1];
  if (weightOz <= 80) return PARCEL_PRESETS[2];
  return PARCEL_PRESETS[3];
}

/* -------------------------------------------------------------------- rates */

const fromAddress = () => ({
  name: site.legalName,
  street1: site.privateContact.address.line1,
  city: site.privateContact.address.city,
  state: site.privateContact.address.state,
  zip: site.privateContact.address.postalCode,
  country: site.privateContact.address.countryCode,
  phone: site.privateContact.phone,
  email: site.contact.support,
});

const toAddress = (order: Order) => {
  const a = order.address;
  if (!a) throw new ShippoError("That order has no shipping address on it.");
  return {
    name: order.name ?? "Customer",
    street1: a.line1 ?? "",
    street2: a.line2 ?? "",
    city: a.city ?? "",
    state: a.state ?? "",
    zip: a.postal_code ?? "",
    country: a.country ?? "US",
    phone: order.phone ?? "",
    email: order.email ?? "",
  };
};

type RawRate = {
  object_id?: string;
  provider?: string;
  carrier_account?: string;
  servicelevel?: { name?: string; token?: string };
  amount?: string;
  currency?: string;
  estimated_days?: number;
  attributes?: string[];
};

export async function getRates(order: Order, parcel: Parcel): Promise<ShippoRate[]> {
  const key = await shippoKey();
  if (!key) throw new ShippoError("Shippo isn't connected — add SHIPPO_API_KEY to switch on live rates.");

  const body = {
    address_from: fromAddress(),
    address_to: toAddress(order),
    parcels: [
      {
        length: String(parcel.lengthIn),
        width: String(parcel.widthIn),
        height: String(parcel.heightIn),
        distance_unit: "in",
        // Ounces rather than pounds: most of this catalogue is well under a
        // pound, and rounding a 3 oz pendant up to 1 lb overpays every time.
        weight: String(parcel.weightOz),
        mass_unit: "oz",
      },
    ],
    // Synchronous: we want the rates in this request, not a callback.
    async: false,
  };

  const shipment = await call<{ rates?: RawRate[]; messages?: unknown; status?: string }>("/shipments/", {
    key,
    method: "POST",
    body: JSON.stringify(body),
  });

  const rates = (shipment.rates ?? [])
    .filter((r) => r.object_id && r.amount)
    .map<ShippoRate>((r) => ({
      id: r.object_id!,
      carrier: r.provider ?? "Carrier",
      service: r.servicelevel?.name ?? r.servicelevel?.token ?? "Service",
      amount: Number(r.amount),
      currency: r.currency ?? "USD",
      estimatedDays: typeof r.estimated_days === "number" ? r.estimated_days : null,
      attributes: Array.isArray(r.attributes) ? r.attributes : [],
    }))
    .filter((r) => Number.isFinite(r.amount))
    .sort((a, b) => a.amount - b.amount);

  if (rates.length === 0) {
    const why = describe(shipment, 200);
    throw new ShippoError(
      `No rates came back for that parcel. ${why === "Shippo returned 200." ? "Check the address and the box size." : why}`,
    );
  }
  return rates;
}

/* -------------------------------------------------------------------- label */

type RawTransaction = {
  object_id?: string;
  status?: string;
  tracking_number?: string;
  tracking_url_provider?: string;
  label_url?: string;
  messages?: unknown;
  rate?: { provider?: string; amount?: string } | string;
};

/**
 * Buy a label for a rate. Spends real money — only ever called from an endpoint
 * that a signed-in admin triggered by hand.
 */
export async function buyLabel(rateId: string): Promise<BoughtLabel> {
  const key = await shippoKey();
  if (!key) throw new ShippoError("Shippo isn't connected.");

  const tx = await call<RawTransaction>("/transactions", {
    key,
    method: "POST",
    body: JSON.stringify({
      rate: rateId,
      // 4x6 is what every thermal label printer expects.
      label_file_type: "PDF_4x6",
      async: false,
    }),
  });

  // A 200 with status ERROR is Shippo's normal way of reporting a refused
  // purchase, so this has to be checked explicitly — the HTTP status alone
  // would have us telling you a label was bought when it wasn't.
  const status = (tx.status ?? "").toUpperCase();
  if (status !== "SUCCESS") {
    throw new ShippoError(describe(tx, 200) || `Shippo refused the purchase (status ${status || "unknown"}).`);
  }
  if (!tx.tracking_number) {
    throw new ShippoError("Shippo reported success but sent no tracking number — check your Shippo dashboard before retrying.");
  }

  const rate = typeof tx.rate === "object" && tx.rate ? tx.rate : undefined;

  return {
    transactionId: tx.object_id ?? "",
    tracking: tx.tracking_number,
    carrier: rate?.provider ?? "",
    labelUrl: tx.label_url ?? null,
    trackingUrl: tx.tracking_url_provider ?? null,
    amount: Number(rate?.amount ?? 0) || 0,
  };
}

/* ----------------------------------------------------------------- tracking */

export type TrackingStatus = {
  status: string;
  detail: string | null;
  city: string | null;
  state: string | null;
  updatedAt: string | null;
  eta: string | null;
};

export async function trackShipment(carrier: string, tracking: string): Promise<TrackingStatus | null> {
  const key = await shippoKey();
  if (!key) return null;

  const token = carrierToken(carrier);
  if (!token) return null;

  try {
    const t = await call<{
      tracking_status?: { status?: string; status_details?: string; status_date?: string;
        location?: { city?: string; state?: string } };
      eta?: string;
    }>(`/tracks/${token}/${encodeURIComponent(tracking)}`, { key, method: "GET" });

    const s = t.tracking_status;
    if (!s?.status) return null;
    return {
      status: s.status,
      detail: s.status_details ?? null,
      city: s.location?.city ?? null,
      state: s.location?.state ?? null,
      updatedAt: s.status_date ?? null,
      eta: t.eta ?? null,
    };
  } catch {
    // Tracking is a nicety. A carrier outage must not take the dashboard down.
    return null;
  }
}

const carrierToken = (carrier: string): string | null => {
  switch (carrier.toLowerCase()) {
    case "usps": return "usps";
    case "ups": return "ups";
    case "fedex": return "fedex";
    case "dhl":
    case "dhl express": return "dhl_express";
    default: return null;
  }
};
