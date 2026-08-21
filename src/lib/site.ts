/**
 * Single source of truth for business identity and policy values.
 *
 * Every legal page, the footer, checkout, and the structured data Google reads
 * pull from this file. Change a value here and it updates everywhere — which is
 * exactly what you want when a policy has to stay consistent across a site.
 *
 * ⚠️  ITEMS MARKED `TODO` MUST BE FILLED IN BEFORE YOU TAKE A REAL ORDER.
 *     A store with no verifiable address or phone number is the single most
 *     common reason US shoppers abandon a checkout on a site they don't know.
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
    // TODO: replace with your real published business phone number
    phone: "TODO_PHONE",
    phoneHref: "tel:TODO_PHONE",
    // Hours shown next to the contact details so people know when to expect a reply
    hours: "Monday to Friday, 9am – 5pm Central",
    responseTime: "within 1 business day",
  },

  address: {
    // TODO: replace with your registered business address
    line1: "TODO_STREET_ADDRESS",
    city: "TODO_CITY",
    state: "TODO_STATE",
    postalCode: "TODO_ZIP",
    country: "United States",
    countryCode: "US",
  },

  // TODO: the US state your LLC is formed in — governs your terms and your sales tax
  governingState: "TODO_STATE",

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
export const hasPlaceholders = () =>
  JSON.stringify(site).includes("TODO_");
