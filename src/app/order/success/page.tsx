import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ClearCart } from "./ClearCart";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };

export default async function Success({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  return (
    <>
      <ClearCart />
      <PageHeader
        eyebrow="Thank you"
        title="Your order is confirmed"
        lede={`Payment went through and a receipt is on its way to your email. We'll pack and dispatch within ${site.policy.handlingDays}, then email you a tracking number the moment the label is bought.`}
      />

      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        {session_id && (
          <p className="mb-8 rounded-2xl border border-duv-line bg-white px-5 py-4 text-[13.5px] text-duv-muted">
            Reference{" "}
            <span className="font-mono font-semibold text-duv-plum">
              {session_id.slice(-12)}
            </span>{" "}
            — quote this if you need to contact us about the order.
          </p>
        )}

        <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em]">
          What happens next
        </h2>
        <ol className="mt-5 space-y-4">
          {[
            ["Receipt", "Sent to your email address straight away. Keep it — it's your proof of purchase."],
            ["Packing", `We pick and pack within ${site.policy.handlingDays}.`],
            ["Tracking", "Emailed automatically when the shipping label is purchased."],
            ["Delivery", site.policy.deliveryEstimate + "."],
          ].map(([t, b], i) => (
            <li key={t} className="flex gap-4">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-duv-plum font-mono text-[12px] font-bold text-white"
              >
                {i + 1}
              </span>
              <div>
                <h3 className="text-[15px] font-extrabold">{t}</h3>
                <p className="mt-0.5 text-[14px] leading-relaxed text-duv-muted">{b}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-10 rounded-3xl bg-tint-printing p-7">
          <h2 className="font-display text-[19px] font-extrabold">Something not right?</h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-duv-plum/75">
            Email{" "}
            <a
              className="font-semibold underline underline-offset-2"
              href={`mailto:${site.contact.support}`}
            >
              {site.contact.support}
            </a>{" "}
            with your reference above. If the shipping address is wrong, tell us immediately —
            we can change it free before the label is printed.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/shop"
            className="rounded-full bg-duv-pink px-7 py-3.5 text-[15px] font-bold text-white hover:bg-duv-coral"
          >
            Keep shopping
          </Link>
          <Link
            href="/policies/returns"
            className="rounded-full border-2 border-duv-plum px-7 py-[12px] text-[15px] font-bold text-duv-plum hover:border-duv-violet hover:text-duv-violet"
          >
            Returns policy
          </Link>
        </div>
      </div>
    </>
  );
}
