import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { site, money } from "@/lib/site";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Straight answers on shipping, returns, payment security, DTF supplies, gold plating and custom printing.",
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "How much is shipping?",
    a: `Flat ${money(site.policy.shippingFlatRate)} anywhere in the US, free on orders over ${money(site.policy.freeShippingThreshold)} before tax. The rate does not change with weight or item count.`,
  },
  {
    q: "How quickly do orders ship?",
    a: `We dispatch within ${site.policy.handlingDays} of payment clearing, then delivery normally takes ${site.policy.deliveryEstimate}. Tracking is emailed automatically as soon as the label is bought.`,
  },
  {
    q: "Do you ship outside the United States?",
    a: "Not currently. If you are overseas and want something from the catalogue, email sales@duvcollections.com and we will quote you directly rather than leave you guessing.",
  },
  {
    q: "Is my card safe on this site?",
    a: "Your card details never reach our servers. Checkout is handled by Stripe, a PCI DSS Level 1 processor, and your card number goes straight from your browser to them. We only ever see the last four digits.",
  },
  {
    q: "Can I return something?",
    a: `Yes — ${site.policy.returnWindowDays} days from delivery on unused items in original packaging. You pay return postage unless the item was faulty, damaged or wrong, in which case we do. Custom prints and worn pierced jewelry are final sale, but defects are always replaced free.`,
  },
  {
    q: "Is “gold plated” real gold?",
    a: "It is a base metal with a gold-coloured plated finish, not solid gold. It looks the part and prices accordingly. Plating wears over time, faster with exposure to water, perfume and friction.",
  },
  {
    q: "Will the assorted lots match the photo exactly?",
    a: "No, and we would rather say so upfront. Multi-pair earring packs, ring assortments and nose ring lots contain mixed designs. Photographs are representative. Variation within an assortment is expected; missing or broken pieces are not, and we replace those.",
  },
  {
    q: "Which DTF film should I buy — sheets or roll?",
    a: "Rolls suit continuous production on a roll-fed printer and cost less per square metre. Sheets suit sheet-fed printers and short runs. If you are testing a new design, buy sheets; if you are running an order, buy the roll.",
  },
  {
    q: "Do you offer wholesale pricing?",
    a: "Yes, on quantity. Email sales@duvcollections.com with the items and volumes you want and we will quote. If you hold a resale certificate, send it before ordering so we can set up a tax-exempt purchase — we cannot refund tax afterwards.",
  },
  {
    q: "How does custom printing work?",
    a: "Send artwork, we quote in writing, you approve a digital proof, then we print and ship. Nothing goes on a press until you have signed off the proof. Requesting a quote costs nothing.",
  },
  {
    q: "What file formats do you accept for artwork?",
    a: "PNG, JPG, PDF, AI and SVG. Vector files (AI, SVG, PDF) print sharpest at any size. For raster files, send the highest resolution you have — we will tell you honestly if it will not hold up at print size rather than printing something blurry.",
  },
  {
    q: "My tracking has not updated in days. What now?",
    a: "Carrier scans can stall for a few days without the parcel being lost. If it has been 7 days with no movement, email us and we will open a trace with the carrier on your behalf.",
  },
];

export default function Faq() {
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <PageHeader
        eyebrow="Questions"
        title="The things people actually ask"
        lede="Real answers, including the ones that are not flattering to us. If yours is not here, email and we will add it."
      />
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <dl className="divide-y divide-duv-line">
          {FAQ.map((f) => (
            <div key={f.q} className="py-6">
              <dt className="font-display text-[19px] font-extrabold leading-snug tracking-[-0.02em]">
                {f.q}
              </dt>
              <dd className="mt-2.5 text-[15px] leading-relaxed text-duv-muted">{f.a}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-12 rounded-3xl bg-tint-gifts p-8 text-center">
          <p className="font-display text-xl font-extrabold">Still stuck?</p>
          <p className="mx-auto mt-2 max-w-[44ch] text-[14.5px] leading-relaxed text-duv-plum/75">
            Email us and a person replies {site.contact.responseTime}. Include your order number
            if you have one.
          </p>
          <Link
            href="/contact"
            className="mt-6 inline-block rounded-full bg-duv-plum px-7 py-3.5 text-[14.5px] font-bold text-white hover:bg-duv-violet"
          >
            Contact us
          </Link>
        </div>
      </div>
    </>
  );
}
