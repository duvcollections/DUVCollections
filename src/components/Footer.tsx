import Link from "next/link";
import { Logo } from "@/components/Mark";
import { site } from "@/lib/site";
import { visibleCategories } from "@/lib/catalog";

const POLICIES = [
  { href: "/policies/shipping", label: "Shipping Policy" },
  { href: "/policies/returns", label: "Returns & Refunds" },
  { href: "/policies/payment", label: "Payment Policy" },
  { href: "/policies/privacy", label: "Privacy Policy" },
  { href: "/policies/terms", label: "Terms & Conditions" },
];

const COMPANY = [
  { href: "/about", label: "About DUV" },
  { href: "/custom-printing", label: "Custom Printing" },
  { href: "/contact", label: "Contact Us" },
  { href: "/faq", label: "FAQ" },
  { href: "/orders", label: "Track your order" },
];

/** Outside the component: calling an impure function during render isn't allowed. */
function currentYear(): number {
  return new Date().getFullYear();
}

export async function Footer() {
  return (
    <footer className="mt-24 bg-duv-plum text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo reversed />
            <p className="mt-4 max-w-[34ch] text-[14px] leading-relaxed text-white/70">
              {site.tagline}. Family-run, US-based, and shipping since {site.founded}.
            </p>
            <p className="mt-5 text-[13px] leading-relaxed text-white/60">
              <span className="font-semibold text-white/85">{site.legalName}</span>
              <br />
              A registered US limited liability company
            </p>
          </div>

          <nav aria-labelledby="foot-shop">
            <h2 id="foot-shop" className="text-[11px] font-bold uppercase tracking-[0.16em] text-duv-cyan">
              Shop
            </h2>
            <ul className="mt-4 flex flex-col gap-2.5 text-[14px]">
              {(await visibleCategories()).map((c) => (
                <li key={c.id}>
                  <Link className="text-white/75 transition-colors hover:text-white" href={`/shop/${c.id}`}>
                    {c.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link className="text-white/75 transition-colors hover:text-white" href="/shop">
                  Everything
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-labelledby="foot-company">
            <h2 id="foot-company" className="text-[11px] font-bold uppercase tracking-[0.16em] text-duv-amber">
              Company
            </h2>
            <ul className="mt-4 flex flex-col gap-2.5 text-[14px]">
              {COMPANY.map((l) => (
                <li key={l.href}>
                  <Link className="text-white/75 transition-colors hover:text-white" href={l.href}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="foot-policies">
            <h2 id="foot-policies" className="text-[11px] font-bold uppercase tracking-[0.16em] text-duv-pink-plum">
              Policies
            </h2>
            <ul className="mt-4 flex flex-col gap-2.5 text-[14px]">
              {POLICIES.map((l) => (
                <li key={l.href}>
                  <Link className="text-white/75 transition-colors hover:text-white" href={l.href}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-6 border-t border-white/15 pt-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-1 text-[13.5px] text-white/70">
            <a className="font-semibold text-white hover:text-duv-amber" href={`mailto:${site.contact.support}`}>
              {site.contact.support}
            </a>
            <span>
              {site.contact.hours} · We reply {site.contact.responseTime}
            </span>
          </div>
          <div className="flex flex-col gap-2 lg:items-end">
            <p className="text-[12.5px] text-white/50">
              © {currentYear()} {site.legalName}. All rights reserved. Policies last
              updated {site.policiesLastUpdated}.
            </p>
            {/* Staff only. The page behind this is protected by Cloudflare Access,
                so the link gives away nothing — an unauthorised visitor gets a
                login screen, never a dashboard. */}
            <Link
              href="/admin"
              className="text-[12.5px] text-duv-on-plum underline underline-offset-4 transition-colors hover:text-white"
            >
              Staff login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
