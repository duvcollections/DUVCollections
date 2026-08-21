import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { site } from "@/lib/site";

const POLICIES = [
  { href: "/policies/shipping", label: "Shipping" },
  { href: "/policies/returns", label: "Returns & Refunds" },
  { href: "/policies/payment", label: "Payment" },
  { href: "/policies/privacy", label: "Privacy" },
  { href: "/policies/terms", label: "Terms & Conditions" },
];

export function PolicyLayout({
  title,
  lede,
  current,
  children,
}: {
  title: string;
  lede: string;
  current: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <PageHeader eyebrow="Policies" title={title} lede={lede} />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <Breadcrumbs
          trail={[{ href: "/", label: "Home" }, { label: title }]}
        />
        <div className="grid gap-12 lg:grid-cols-[220px_1fr]">
          <nav aria-label="All policies" className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-duv-faint">
              All policies
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2 lg:flex-col lg:gap-0">
              {POLICIES.map((p) => (
                <li key={p.href}>
                  <Link
                    href={p.href}
                    aria-current={p.href === current ? "page" : undefined}
                    className={`block rounded-lg px-3 py-2 text-[14px] font-semibold transition-colors ${
                      p.href === current
                        ? "bg-duv-plum text-white"
                        : "text-duv-muted hover:bg-white hover:text-duv-plum"
                    }`}
                  >
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[12.5px] leading-relaxed text-duv-faint">
              Last updated {site.policiesLastUpdated}
            </p>
          </nav>

          <div className="prose-duv">
            {children}

            <hr className="rule-ink my-12" />
            <h2>Questions about this policy</h2>
            <p>
              Email{" "}
              <a href={`mailto:${site.contact.support}`}>{site.contact.support}</a> and a person
              will answer — usually {site.contact.responseTime}. We are open{" "}
              {site.contact.hours}.
            </p>
            <p className="text-[13.5px]">
              <strong>{site.legalName}</strong>
              <br />
              A limited liability company registered in the State of {site.governingState},
              United States.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
