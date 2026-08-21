import Link from "next/link";
import { adminOrNull } from "@/lib/access";
import { listOrders } from "@/lib/orders-admin";
import { ImportTracking } from "./ImportTracking";

export const dynamic = "force-dynamic";

export default async function Shipping() {
  if (!(await adminOrNull())) return null;

  const orders = await listOrders(60).catch(() => []);
  const waiting = orders.filter((o) => o.status === "paid");

  return (
    <>
      <h1 className="font-display text-3xl font-extrabold tracking-[-0.025em]">Shipping</h1>
      <p className="mt-2 max-w-[68ch] text-[14.5px] leading-relaxed text-duv-muted">
        Two file moves instead of retyping every address and every tracking number. Pirate Ship is
        free at any volume — no monthly fee, no per-label fee, no markup on postage — but it has no
        API, so this is a round trip rather than a live connection.
      </p>

      <section className="mt-8 rounded-2xl border border-duv-line bg-white p-6">
        <h2 className="font-display text-lg font-extrabold tracking-tight">
          1. Send the addresses out
        </h2>
        <p className="mt-1.5 max-w-[64ch] text-[13.5px] leading-relaxed text-duv-muted">
          {waiting.length === 0 ? (
            <>Nothing is waiting for a label right now.</>
          ) : (
            <>
              <strong className="text-duv-plum">{waiting.length} order(s)</strong> need a label.
              Download the file, then in Pirate Ship choose{" "}
              <strong className="text-duv-plum">Ship &rarr; Import a spreadsheet</strong> and drop
              it in.
            </>
          )}
        </p>
        <p className="mt-3 max-w-[64ch] text-[12.5px] leading-relaxed text-duv-faint">
          Weights are worked out from the SKUs on each order plus an ounce for packaging. Where a
          SKU isn&rsquo;t in the catalogue the weight is left blank rather than guessed — an
          understated weight becomes postage due at the customer&rsquo;s door.
        </p>
        <a
          href="/api/admin/ship-csv"
          className="mt-4 inline-block rounded-full bg-duv-pink px-7 py-3 text-[14.5px] font-bold text-white transition-colors hover:bg-duv-coral"
        >
          Download {waiting.length} unshipped order(s)
        </a>
      </section>

      <section className="mt-6">
        <ImportTracking />
      </section>

      <p className="mt-8 text-[13px] text-duv-muted">
        Shipping one parcel? <Link href="/admin/orders" className="font-bold text-duv-violet underline underline-offset-4">Open the order</Link> and
        paste the tracking number there instead — same result, less ceremony.
      </p>
    </>
  );
}
