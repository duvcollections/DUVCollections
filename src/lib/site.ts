/**
 * Single source of truth for business identity and policy values.
 *
 * Every legal page, the footer, checkout, and the structured data Google reads
 * pull from this file. Change a value here and it updates everywhere — which is
 * exactly what you want when a policy has to stay consistent across a site.
 *
 * The street address and phone number live under `privateContact` and are
 * deliberately NOT rendered anywhere on the site. See docs/business-address.md
 * for why that trade-off matters and what to do about it.
 */

export const site = {
  name: "DUV Collections",
  legalName: "DUV Prints and Gifts USA LLC",
  tagline: "Printing supplies, jewelry and gifts — shipped from the USA",
  url: "https://duvcollections.com",
  founded: "2023",

  contact: {
    sales: "sales@duvcollections.com",
    support: "info@duvcollections.com",
    admin: "tony@duvcollections.com",
    hours: "Monday to Friday, 9am – 5pm Central",
    responseTime: "within 1 business day",
  },

  /**
   * PRIVATE — never rendered on any page.
   *
   * Kept here because Stripe verification, tax registration and shipping labels
   * all need it, and because one source of truth beats it living in three places.
   * Nothing in `src/` reads these fields into the UI; see the note in
   * docs/business-address.md before changing that.
   */
  privateContact: {
    phone: "972-400-3117",
    address: {
      line1: "300 Golden Sands Ln",
      city: "Princeton",
      state: "TX",
      postalCode: "75407",
      country: "United States",
      countryCode: "US",
    },
  },

  /** The US state the LLC is formed in — governs the Terms and sales tax nexus. */
  governingState: "Texas",

  policy: {
    shippingFlatRate: 5.99,
    freeShippingThreshold: 75,
    handlingDays: "1–2 business days",
    deliveryEstimate: "3–7 business days after dispatch",
    returnWindowDays: 30,
    returnShippingPaidBy: "customer" as const,
    customItemsFinalSale: true,
    restockingFee: 0,
    shipsTo: "United States",
  },

  external: {
    ebay: "https://www.ebay.com/str/karishmausa",
    ebayFeedback: "100% positive",
    ebayOrders: "1,900+",
  },

  // Bumped whenever a policy page changes, so customers can see what they agreed to
  policiesLastUpdated: "August 21, 2026",
} as const;

export const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/** True when a placeholder is still in place — used to warn you in development. */
export const hasPlaceholders = () => JSON.stringify(site).includes("TODO_");
