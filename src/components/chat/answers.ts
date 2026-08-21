import { site, money } from "@/lib/site";

/**
 * The bot's entire knowledge, written out.
 *
 * Every figure below is read from `site.ts`, the same source the policy pages
 * and the checkout use. That is the point: a bot that quotes a number from its
 * own copy will eventually quote a stale one, and a wrong delivery estimate from
 * a chat window is a promise the business then has to keep.
 *
 * There is no language model here. It matches keywords, answers from this list,
 * and when it doesn't recognise something it says so and hands over to a person.
 * A scripted bot that admits ignorance beats a fluent one that invents a refund
 * policy — the invented answer is the one the customer screenshots.
 */

export type Answer = {
  id: string;
  /** Words that route to this answer. Matched as whole-ish substrings, lowercased. */
  triggers: string[];
  /** Shown as a tappable chip. Keep it short. */
  chip: string;
  body: () => string;
  /** Optional follow-on link. */
  link?: { href: string; label: string };
};

export const ORDER_INTENT = "order";

export const ANSWERS: Answer[] = [
  {
    id: ORDER_INTENT,
    triggers: [
      "track", "tracking", "where is", "wheres", "where's", "my order", "order status",
      "parcel", "package", "delivery status", "shipped yet", "dispatch",
    ],
    chip: "Track my order",
    body: () => "",
  },
  {
    id: "shipping",
    triggers: ["shipping", "postage", "how long", "delivery time", "arrive", "when will", "dispatch time"],
    chip: "Shipping & delivery",
    body: () =>
      `Shipping is a flat ${money(site.policy.shippingFlatRate)}, and free once your order passes ` +
      `${money(site.policy.freeShippingThreshold)}. We pack and dispatch within ${site.policy.handlingDays}, ` +
      `and delivery then takes ${site.policy.deliveryEstimate}. We ship to ${site.policy.shipsTo} only. ` +
      `You get a tracking number by email the moment the label is bought.`,
    link: { href: "/policies/shipping", label: "Full shipping policy" },
  },
  {
    id: "returns",
    triggers: ["return", "refund", "exchange", "send back", "money back", "wrong item", "damaged", "broken"],
    chip: "Returns & refunds",
    body: () =>
      `You have ${site.policy.returnWindowDays} days from delivery to start a return on an unused ` +
      `item in its original packaging. Return shipping is paid by the customer unless the item ` +
      `arrived damaged or we sent the wrong thing — then it's on us. Custom and personalised ` +
      `printing is final sale, because it can't be resold to anyone else. ` +
      `If something arrived damaged, photograph the box and the contents before you unpack ` +
      `further: that's what a carrier claim needs.`,
    link: { href: "/policies/returns", label: "Full returns policy" },
  },
  {
    id: "payment",
    triggers: ["payment", "pay", "card", "visa", "mastercard", "apple pay", "google pay", "paypal", "secure", "safe"],
    chip: "Payment & security",
    body: () =>
      `Card payments are handled by Stripe — we never see or store your card number. ` +
      `Cards, Apple Pay and Google Pay all work. Sales tax is calculated at checkout by ` +
      `state, and everything is priced in USD.`,
    link: { href: "/policies/payment", label: "Payment policy" },
  },
  {
    id: "custom",
    triggers: ["custom", "print", "printing", "artwork", "design", "quote", "sublimation", "dtf print", "logo"],
    chip: "Custom printing",
    body: () =>
      `Send us artwork as PNG, JPG, PDF, AI or SVG and we'll come back with a written price ` +
      `and turnaround, usually within one business day. Nothing is pressed until you approve a ` +
      `digital proof. We'll also tell you honestly if a file won't hold up at the size you want.`,
    link: { href: "/custom-printing", label: "Request a quote" },
  },
  {
    id: "wholesale",
    triggers: ["wholesale", "bulk", "trade", "reseller", "resale", "discount", "quantity"],
    chip: "Wholesale & bulk",
    body: () =>
      `We do bulk pricing on DTF supplies and wholesale jewelry lots. Email ${site.contact.sales} ` +
      `with the SKUs and quantities you're after and we'll quote. If you have a resale ` +
      `certificate, send it with your first order and we'll set your account to tax-exempt.`,
    link: { href: "/contact", label: "Contact sales" },
  },
  {
    id: "stock",
    triggers: ["stock", "in stock", "available", "availability", "sold out", "restock", "back in"],
    chip: "Stock & availability",
    body: () =>
      `Every product page shows live stock. If something is out, it's genuinely out rather than ` +
      `hidden — we restock the fast movers weekly. Email ${site.contact.sales} with the SKU and ` +
      `we'll tell you when it's back.`,
    link: { href: "/shop", label: "Browse everything" },
  },
  {
    id: "contact",
    triggers: ["human", "person", "agent", "speak", "talk", "call", "phone", "email", "contact", "support", "help me"],
    chip: "Talk to a person",
    body: () =>
      `A person reads every message. Write to ${site.contact.support} for anything about an ` +
      `existing order, or ${site.contact.sales} for pricing and quotes. We're open ` +
      `${site.contact.hours} and reply ${site.contact.responseTime}.`,
    link: { href: "/contact", label: "Open the contact form" },
  },
];

/** The chips offered before the visitor has typed anything. */
export const OPENERS = ["order", "shipping", "returns", "custom", "contact"];

/**
 * Route a message to an answer.
 *
 * Scores by how many triggers match and prefers the longest matched trigger, so
 * "where is my order" beats a stray "order" inside "custom order". Returns null
 * rather than guessing when nothing matches — the fallback is a handoff, and an
 * honest handoff is better than a confident wrong answer.
 */
export function route(input: string): Answer | null {
  const text = ` ${input.toLowerCase().replace(/[^a-z0-9'\s]/g, " ").replace(/\s+/g, " ")} `;
  let best: { answer: Answer; score: number } | null = null;

  for (const answer of ANSWERS) {
    let score = 0;
    for (const t of answer.triggers) {
      if (text.includes(` ${t} `) || text.includes(` ${t}`)) score = Math.max(score, t.length);
    }
    if (score > 0 && (!best || score > best.score)) best = { answer, score };
  }
  return best?.answer ?? null;
}

export const FALLBACK =
  `I'm a simple bot — I can look up an order and answer questions about shipping, returns, ` +
  `payment, custom printing and wholesale. That one's outside what I know, so it's better ` +
  `answered by a person than guessed at by me.`;
