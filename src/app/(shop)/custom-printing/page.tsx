import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Custom Printing",
  description:
    "DTF and sublimation printing to your artwork. Written quote, digital proof before we press anything, tracked shipping.",
};

const STEPS = [
  ["Send the artwork", "Email it with what you want it printed on and how many. PNG, JPG, PDF, AI or SVG."],
  ["We quote in writing", `A price and a turnaround, ${site.contact.responseTime}. No obligation, no cost.`],
  ["You approve a proof", "A digital proof showing artwork, placement and size. Nothing is pressed until you say yes."],
  ["We print and ship", "Tracking emailed the moment the label is bought."],
];

export default function CustomPrinting() {
  return (
    <>
      <PageHeader
        eyebrow="Custom printing"
        title="Your artwork, pressed properly"
        lede="DTF and sublimation printing on our blanks or yours. Every job is quoted in writing and proofed before it goes near a press — because a surprise on a custom order is nobody's idea of a good time."
      >
        <a
          href={`mailto:${site.contact.sales}?subject=Custom%20printing%20quote`}
          className="mt-8 inline-block rounded-full bg-duv-pink px-8 py-4 text-[15px] font-bold text-white hover:bg-duv-coral"
        >
          Email a quote request
        </a>
      </PageHeader>

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([t, b], i) => (
            <li key={t} className="rounded-3xl border border-duv-line bg-white p-6">
              <span className="font-mono text-[12px] font-bold text-duv-pink">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="mt-2.5 font-display text-[18px] font-extrabold tracking-[-0.02em]">
                {t}
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-duv-muted">{b}</p>
            </li>
          ))}
        </ol>

        <div className="mt-14 grid gap-10 lg:grid-cols-2">
          <div className="prose-duv">
            <h2>What we can print</h2>
            <ul>
              <li><strong>DTF transfers</strong> — full colour on cotton, polyester and blends, light or dark.</li>
              <li><strong>Sublimation</strong> — for polyester and coated hard goods; the ink becomes part of the material rather than sitting on top.</li>
              <li><strong>Apparel</strong> — tees and caps, printed on our blanks or on garments you supply.</li>
              <li><strong>Gift articles</strong> — personalised items for events, favours and corporate runs.</li>
            </ul>

            <h2>What makes a good file</h2>
            <p>
              Vector files — AI, SVG or PDF — print sharp at any size and are always the best
              option. For photographs and raster art, send the largest version you have; we would
              rather tell you a file will not hold up at size than print something blurry and let
              you find out.
            </p>
            <p>
              If your artwork needs cleaning up, say so. We would rather fix it before the proof
              than after the press.
            </p>

            <h2>What we will not print</h2>
            <p>
              Artwork you do not have the rights to, third-party logos and characters without
              evident authorisation, hate symbols, sexually explicit material, or anything that
              looks designed to defraud. This is not squeamishness — it is what keeps a printing
              business insurable. Full detail in the{" "}
              <Link href="/policies/terms">Terms &amp; Conditions</Link>.
            </p>

            <h2>Your artwork stays yours</h2>
            <p>
              You keep every right in what you send us. We use it to produce your order and
              nothing else — we will not print it for anyone else, and we will not use it as a
              sample without asking you first.
            </p>
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-3xl bg-tint-jewelry p-7">
              <h2 className="font-display text-[21px] font-extrabold tracking-[-0.02em]">
                Ready to quote
              </h2>
              <p className="mt-3 text-[14.5px] leading-relaxed text-duv-plum/75">
                Include these and you will get a firm price in one reply instead of four:
              </p>
              <ul className="mt-4 space-y-2.5 text-[14px] text-duv-plum/85">
                {[
                  "The artwork file, at its original size",
                  "What it goes on — our blank or yours",
                  "Quantity, and sizes if it's apparel",
                  "Print size and placement",
                  "When you need it",
                ].map((x) => (
                  <li key={x} className="flex gap-2.5">
                    <span aria-hidden="true" className="font-bold text-duv-pink">
                      →
                    </span>
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
              <a
                href={`mailto:${site.contact.sales}?subject=Custom%20printing%20quote`}
                className="mt-7 block rounded-full bg-duv-plum px-6 py-3.5 text-center text-[14.5px] font-bold text-white hover:bg-duv-violet"
              >
                {site.contact.sales}
              </a>
              <p className="mt-3 text-center text-[12.5px] text-duv-plum/60">
                Online artwork upload is coming. For now, email is the fastest route.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
