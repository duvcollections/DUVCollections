import { Mark } from "@/components/Mark";

const EBAY = "https://www.ebay.com/str/karishmausa";

const CATEGORIES = [
  {
    name: "Printing supplies",
    detail: "DTF films, pigment inks, hot-melt powders, heat transfer paper",
    tint: "bg-tint-printing",
  },
  {
    name: "Apparel",
    detail: "Men's tees and caps, blank or printed to your artwork",
    tint: "bg-tint-apparel",
  },
  {
    name: "Jewelry",
    detail: "Gold-plated chains, bangles, rings and stud earrings",
    tint: "bg-tint-jewelry",
  },
  {
    name: "Gifts & custom printing",
    detail: "Gift articles, sublimation printing, your design on our stock",
    tint: "bg-tint-gifts",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-6 py-14 sm:py-20">
      <header className="flex items-center gap-3">
        <Mark className="h-9 w-9" />
        <span className="text-[15px] font-extrabold tracking-tight">
          DUV Collections
        </span>
      </header>

      <div className="flex flex-1 flex-col justify-center py-16 sm:py-24">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-duv-pink">
          Opening soon
        </p>

        <h1 className="mt-5 max-w-[16ch] text-balance text-4xl font-extrabold leading-[1.04] tracking-[-0.03em] sm:text-6xl">
          A new home for everything we print, press and plate
        </h1>

        <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-duv-muted">
          We&rsquo;re building the DUV Collections storefront — the full catalogue in one
          place, with proper search, live stock and a checkout that takes thirty seconds.
          Until it opens, every item is still available on eBay, where we&rsquo;ve shipped
          over 1,900 orders at 100% positive feedback.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-4">
          <a
            href={EBAY}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-duv-pink px-7 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-duv-coral"
          >
            Shop the catalogue on eBay
          </a>
          <a
            href="mailto:sales@duvcollections.com"
            className="text-[15px] font-semibold text-duv-violet underline decoration-2 underline-offset-4 hover:text-duv-pink"
          >
            Ask about bulk or custom orders
          </a>
        </div>
      </div>

      <section aria-labelledby="what-we-sell">
        <h2
          id="what-we-sell"
          className="text-[11px] font-bold uppercase tracking-[0.16em] text-duv-muted"
        >
          What we sell
        </h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <li
              key={c.name}
              className={`${c.tint} rounded-[20px] p-5 sm:min-h-[164px]`}
            >
              <h3 className="text-[15px] font-extrabold tracking-tight">{c.name}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-duv-plum/70">
                {c.detail}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-16 flex flex-col gap-3 border-t border-duv-line pt-7 text-[13px] text-duv-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          DUV Prints and Gifts USA LLC · Shipped from the USA
        </p>
        <p className="flex flex-wrap gap-x-5 gap-y-1">
          <a className="hover:text-duv-violet" href="mailto:sales@duvcollections.com">
            sales@duvcollections.com
          </a>
          <a className="hover:text-duv-violet" href="mailto:info@duvcollections.com">
            info@duvcollections.com
          </a>
        </p>
      </footer>
    </main>
  );
}
