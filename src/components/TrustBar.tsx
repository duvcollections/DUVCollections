import { site, money } from "@/lib/site";

/**
 * The four questions a first-time buyer asks before they will type a card
 * number: who are you, what does shipping cost, what if it's wrong, and is my
 * payment safe. Answering them in the layout — not buried in a policy page — is
 * the cheapest conversion work available to a new store.
 */
const ITEMS = [
  {
    ink: "#00CFFF",
    title: "Free shipping over " + money(site.policy.freeShippingThreshold),
    body: `Flat ${money(site.policy.shippingFlatRate)} below that. Dispatched in ${site.policy.handlingDays}.`,
  },
  {
    ink: "#FF2E93",
    title: site.policy.returnWindowDays + "-day returns",
    body: "Unused and in original packaging. Defects always replaced free.",
  },
  {
    ink: "#FFC53D",
    title: "Secure checkout",
    body: "Card details go straight to Stripe. They never touch our servers.",
  },
  {
    ink: "#7B3FF2",
    title: "A real US business",
    body: `${site.legalName} — ${site.external.ebayOrders} orders shipped, ${site.external.ebayFeedback} feedback.`,
  },
];

export function TrustBar() {
  return (
    <section aria-label="Our promises" className="border-y border-duv-line bg-white">
      <ul className="mx-auto grid max-w-7xl gap-px sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map((it) => (
          <li key={it.title} className="px-6 py-7">
            <span
              className="block h-1.5 w-9 rounded-full"
              style={{ background: it.ink }}
              aria-hidden="true"
            />
            <h3 className="mt-3.5 font-display text-[16px] font-extrabold tracking-[-0.015em]">
              {it.title}
            </h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-duv-muted">{it.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
