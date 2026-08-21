import type { Metadata } from "next";
import { PolicyLayout } from "@/components/PolicyLayout";
import { site, money } from "@/lib/site";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description:
    "How and when DUV Collections ships: flat-rate US shipping, free over $75, dispatch in 1–2 business days, tracking on every order.",
};

const P = site.policy;

export default function Shipping() {
  return (
    <PolicyLayout
      current="/policies/shipping"
      title="Shipping Policy"
      lede="What shipping costs, when your order leaves us, and what happens if it goes missing. No surprises at checkout."
    >

      <h2>What shipping costs</h2>
      <table>
        <thead>
          <tr><th>Order subtotal</th><th>Shipping</th></tr>
        </thead>
        <tbody>
          <tr><td>Under {money(P.freeShippingThreshold)}</td><td>{money(P.shippingFlatRate)} flat rate</td></tr>
          <tr><td>{money(P.freeShippingThreshold)} and over</td><td><strong>Free</strong></td></tr>
        </tbody>
      </table>
      <p>
        The rate is flat regardless of how many items you order or how much they weigh. Shipping
        is calculated on the subtotal before sales tax. If a discount code brings your subtotal
        below {money(P.freeShippingThreshold)}, the flat rate applies.
      </p>

      <h2>Where we ship</h2>
      <p>
        We currently ship to <strong>{P.shipsTo}</strong> only, including PO boxes and APO/FPO
        addresses. We do not ship internationally at this time. If you are outside the US and
        want something from the catalogue, email{" "}
        <a href={`mailto:${site.contact.sales}`}>{site.contact.sales}</a> and we will quote you
        directly rather than leave you guessing.
      </p>

      <h2>When your order leaves us</h2>
      <p>
        Orders are packed and dispatched within <strong>{P.handlingDays}</strong> of payment
        clearing. Orders placed on a weekend or a US federal holiday are processed the next
        business day. Custom-printed items are the exception — those begin only after you approve
        a proof, and the turnaround is quoted with the proof.
      </p>
      <p>
        After dispatch, delivery normally takes <strong>{P.deliveryEstimate}</strong>. That window
        is the carrier&rsquo;s, not ours, and we cannot guarantee it.
      </p>

      <h2>Tracking</h2>
      <p>
        Every order ships with tracking. The number is emailed to you the moment the label is
        purchased — you do not have to ask for it. If it has been more than{" "}
        {P.handlingDays.replace("–", " to ")} and no tracking email has arrived, check your spam
        folder first, then email us.
      </p>

      <h2>If a package is late, lost or damaged</h2>
      <p>
        Once a carrier scans a package as delivered, it is out of our hands — but that does not
        mean you are on your own. Here is what we actually do:
      </p>
      <ul>
        <li>
          <strong>Tracking has not updated in 7 days.</strong> Email us. We open a trace with the
          carrier on your behalf.
        </li>
        <li>
          <strong>Marked delivered but not received.</strong> Check with neighbours and your
          building office first — most turn up within 48 hours. If it does not, tell us within{" "}
          <strong>7 days</strong> of the delivery scan and we will file a claim and work out a
          replacement or refund with you. Past 7 days the carrier will not accept a claim, and
          neither can we. For high-value orders we recommend a shipping address where someone can
          receive the parcel.
        </li>
        <li>
          <strong>Arrived damaged.</strong> Photograph the box and the contents before you throw
          any packaging away, and send the photos within <strong>72 hours</strong>. The
          photographs are what the carrier claim depends on. We replace damaged goods at our cost.
        </li>
      </ul>

      <h2>Address accuracy</h2>
      <p>
        We ship to the address you enter at checkout, exactly as entered. If it is wrong and the
        package is returned to us, we will re-ship it once you cover the second postage. If it is
        wrong and the package is delivered to that wrong address,{" "}
        <strong>we cannot recover it and cannot refund it</strong> — the parcel went where you
        told us to send it. Please check your address before paying; it is the single most common
        cause of a lost order.
      </p>
      <p>
        Some carriers leave parcels without a signature. Where you have given delivery
        instructions to a carrier directly — leave with a neighbour, leave in a porch, leave in a
        safe place — the delivery is complete when the carrier follows them, and what happens
        afterwards is outside what we can claim for.
      </p>
      <p>
        Need to correct an address after ordering? Email us immediately. If we have not printed
        the label yet we can change it for free.
      </p>
    </PolicyLayout>
  );
}
