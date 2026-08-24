import type { Product } from "@/lib/catalog";
import { availability } from "@/lib/catalog";
import { site } from "@/lib/site";

/**
 * Publishing the catalogue to outside sales channels.
 *
 * Structured as one canonical listing shape plus a small adapter per channel,
 * because the alternative — writing eBay, Amazon and Meta integrations
 * separately — means the same "is this product ready to sell?" question gets
 * answered three times and drifts three ways.
 *
 * Every channel here is FEED-based today. A feed is a file the channel fetches
 * on its own schedule, which needs no credentials, no OAuth dance and no API
 * approval; it is how Google Shopping and Meta catalogues actually work, and
 * eBay/Amazon both accept one as a bulk-listing route. When you have API
 * credentials and want live push instead, the readiness rules and the field
 * mapping below are already done — only the transport changes.
 */

export type ChannelId = "google" | "meta" | "ebay" | "amazon";

export type Channel = {
  id: ChannelId;
  name: string;
  /** What the channel fetches, relative to the site root. */
  feedPath: string;
  format: string;
  /** What the shop owner has to do outside this app. */
  setup: string[];
  /** Rules this channel enforces beyond the shared ones. */
  extraRules: string[];
};

export const CHANNELS: Channel[] = [
  {
    id: "google",
    name: "Google Shopping",
    feedPath: "/feed.xml",
    format: "RSS 2.0 with the g: namespace",
    setup: [
      "Create a Merchant Center account and claim duvcollections.com.",
      "Add a scheduled feed pointing at the URL above, fetched daily.",
    ],
    extraRules: ["Rejects any product without an image."],
  },
  {
    id: "meta",
    name: "Facebook & Instagram",
    feedPath: "/feed/meta.csv",
    format: "CSV, Meta commerce columns",
    setup: [
      "Create a catalogue in Meta Commerce Manager.",
      "Add a scheduled data feed pointing at the URL above.",
      "Connect the catalogue to your Facebook page and Instagram account.",
    ],
    extraRules: [
      "Rejects products without an image.",
      "Availability must be one of in stock / out of stock.",
    ],
  },
  {
    id: "ebay",
    name: "eBay",
    feedPath: "/feed/ebay.csv",
    format: "CSV for eBay File Exchange",
    setup: [
      "Enable File Exchange on your eBay seller account.",
      "Map each product to an eBay category before the first upload.",
      "Upload the CSV from Seller Hub, or schedule a fetch.",
    ],
    extraRules: [
      "Needs an eBay category id per product — not something this app can guess.",
      "Duplicate listings are possible: check nothing is already listed.",
    ],
  },
  {
    id: "amazon",
    name: "Amazon",
    feedPath: "/feed/amazon.txt",
    format: "Tab-delimited flat file",
    setup: [
      "Open a Seller Central account with a Professional plan.",
      "Apply for approval in each category you intend to list in.",
      "Upload the flat file under Inventory → Add products via upload.",
    ],
    extraRules: [
      "Requires a real GTIN/UPC on every product, or a brand-registry exemption.",
      "Jewelry needs category approval before anything can list.",
    ],
  },
];

export const getChannel = (id: string) => CHANNELS.find((c) => c.id === id);

/* ------------------------------------------------------------ readiness */

export type Blocker = { sku: string; title: string; reason: string };

export type ChannelReadiness = {
  channel: Channel;
  ready: Product[];
  blocked: Blocker[];
};

/**
 * Which products this channel would actually accept.
 *
 * Reported per channel rather than as one number, because the requirements
 * genuinely differ: Amazon wants a UPC that Google does not care about, and
 * eBay wants a category mapping neither of the others needs. A single
 * "ready to publish" count would be wrong for at least two of them.
 */
export function readiness(
  channel: Channel,
  products: Product[],
  hasImage: (p: Product) => boolean,
): ChannelReadiness {
  const ready: Product[] = [];
  const blocked: Blocker[] = [];

  for (const p of products) {
    if (p.archived) continue;

    const add = (reason: string) => blocked.push({ sku: p.sku, title: p.title, reason });

    // Shared rules. A channel showing an item you cannot ship is worse than
    // not listing it: the order still arrives, and then you cancel it.
    if (!hasImage(p)) {
      add("no photograph");
      continue;
    }
    if (availability(p) === "out-of-stock") {
      add("out of stock");
      continue;
    }
    if (!p.description || p.description.trim().length < 20) {
      add("description too short");
      continue;
    }

    // Channel-specific.
    if (channel.id === "amazon" && !p.upc) {
      add("Amazon requires a real UPC");
      continue;
    }

    ready.push(p);
  }

  return { channel, ready, blocked };
}

/* --------------------------------------------------------------- feeds */

const csvCell = (value: string | number | null | undefined): string => {
  const s = value === null || value === undefined ? "" : String(value);
  // A leading =, +, - or @ makes a spreadsheet treat the cell as a formula.
  // Channels open these files in Excel, so neutralise it.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

const row = (cells: (string | number | null | undefined)[]) =>
  cells.map(csvCell).join(",");

const productUrl = (p: Product) => `${site.url}/product/${p.slug}`;

/** Meta commerce catalogue CSV. */
export function metaFeed(items: Product[], imageUrl: (p: Product) => string): string {
  const header = [
    "id", "title", "description", "availability", "condition", "price",
    "link", "image_link", "brand", "quantity_to_sell_on_facebook",
  ];
  const lines = [row(header)];
  for (const p of items) {
    lines.push(
      row([
        p.sku,
        p.title,
        p.description,
        availability(p) === "out-of-stock" ? "out of stock" : "in stock",
        "new",
        `${p.price.toFixed(2)} USD`,
        productUrl(p),
        imageUrl(p),
        site.name,
        p.stock ?? "",
      ]),
    );
  }
  return lines.join("\n") + "\n";
}

/** eBay File Exchange CSV. */
export function ebayFeed(items: Product[], imageUrl: (p: Product) => string): string {
  // Action first — File Exchange reads it to decide add vs revise.
  const header = [
    "*Action", "CustomLabel", "*Category", "*Title", "*Description",
    "*ConditionID", "PicURL", "*Quantity", "*Format", "*StartPrice",
    "*Duration", "*Location", "ProductUPC",
  ];
  const lines = [row(header)];
  for (const p of items) {
    lines.push(
      row([
        "Add",
        p.sku,
        // Left blank deliberately: an eBay category id is a number from their
        // taxonomy, and guessing it would list a chain under car parts.
        "",
        p.title.slice(0, 80),
        p.description,
        1000, // New
        imageUrl(p),
        p.stock ?? 1,
        "FixedPrice",
        p.price.toFixed(2),
        "GTC",
        // City and state ONLY — eBay requires an item location and this is
        // what buyers see on a listing. The street address stays private and
        // must never be added here; it belongs in the shipping label alone.
        `${site.privateContact.address.city}, ${site.privateContact.address.state}`,
        p.upc ?? "",
      ]),
    );
  }
  return lines.join("\n") + "\n";
}

/** Amazon tab-delimited flat file. */
export function amazonFeed(items: Product[], imageUrl: (p: Product) => string): string {
  const header = [
    "sku", "product-id", "product-id-type", "item-name", "item-description",
    "listing-price", "quantity", "main-image-url", "brand-name", "condition-type",
  ];
  const lines = [header.join("\t")];
  for (const p of items) {
    lines.push(
      [
        p.sku,
        p.upc ?? "",
        p.upc ? "UPC" : "",
        p.title,
        // Tabs and newlines would break the column structure.
        p.description.replace(/[\t\r\n]+/g, " "),
        p.price.toFixed(2),
        p.stock ?? 1,
        imageUrl(p),
        site.name,
        "New",
      ].join("\t"),
    );
  }
  return lines.join("\n") + "\n";
}
