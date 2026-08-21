import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ContactForm } from "./ContactForm";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Reach DUV Collections — sales, support and wholesale enquiries, with real response times.",
};

const ROUTES = [
  {
    ink: "#FF2E93",
    who: "Orders & support",
    email: site.contact.support,
    when: "Existing orders, tracking, returns, anything that has gone wrong.",
  },
  {
    ink: "#00CFFF",
    who: "Sales & wholesale",
    email: site.contact.sales,
    when: "Bulk pricing, resale certificates, stock availability, custom print quotes.",
  },
];

export default function Contact() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="A person will read this"
        lede={`We are open ${site.contact.hours} and reply ${site.contact.responseTime}. No ticket queue — a person reads every message.`}
      />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="mb-8 max-w-2xl">
          <ContactForm />
        </div>

        <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.15em] text-duv-faint">
          Or email us directly
        </h2>
        <ul className="grid gap-5 md:grid-cols-2">
          {ROUTES.map((r) => (
            <li key={r.email} className="rounded-3xl border border-duv-line bg-white p-7">
              <span className="block h-1.5 w-10 rounded-full" style={{ background: r.ink }} aria-hidden="true" />
              <h2 className="mt-4 font-display text-[21px] font-extrabold tracking-[-0.02em]">
                {r.who}
              </h2>
              <p className="mt-2 text-[14.5px] leading-relaxed text-duv-muted">{r.when}</p>
              <a
                href={`mailto:${r.email}`}
                className="mt-5 inline-block text-[15px] font-bold text-duv-violet underline decoration-2 underline-offset-4 hover:text-duv-pink"
              >
                {r.email}
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-duv-line bg-white p-7">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-duv-faint">
              Registered business
            </h2>
            <p className="mt-3 text-[15px] font-bold">{site.legalName}</p>
            <p className="mt-1.5 text-[14.5px] leading-relaxed text-duv-muted">
              A limited liability company registered in the State of{" "}
              {site.governingState}, United States. We ship from{" "}
              {site.governingState}.
            </p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-duv-muted">
              We handle everything by email so there is a written record of what was
              agreed — which protects you as much as us. Postal correspondence can be
              arranged; email us and we will send an address.
            </p>
          </div>

          <div className="rounded-3xl bg-tint-printing p-7">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-duv-plum/60">
              Before you write
            </h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-duv-plum/80">
              If it is about an order, include your <strong>order number</strong> — it gets you a
              real answer in one reply instead of three. For a damaged item, attach photographs of
              the box and the contents; that is what a carrier claim needs.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
