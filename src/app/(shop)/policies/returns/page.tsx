import type { Metadata } from "next";
import { PolicyLayout } from "@/components/PolicyLayout";
import { site, money } from "@/lib/site";

export const metadata: Metadata = {
  title: "Returns & Refunds",
  description:
    "30-day returns on unused items, defects always replaced free, and a plain explanation of what is and is not returnable.",
};

const P = site.policy;

export default function Returns() {
  return (
    <PolicyLayout
      current="/policies/returns"
      title="Returns & Refunds"
      lede={`${P.returnWindowDays} days to change your mind on unused stock. Defective or misprinted goods are replaced free, always, whatever the timeline says.`}
    >

      <h2>The short version</h2>
      <ul>
        <li>
          <strong>{P.returnWindowDays} days</strong> from delivery to start a return.
        </li>
        <li>Items must be unused, unopened where sealed, and in their original packaging.</li>
        <li>You pay return postage unless the item was faulty, damaged or wrong.</li>
        <li>
          <strong>No restocking fee on sealed stock.</strong> Opened consumables carry a{" "}
          {P.restockingFeePct}% restocking fee when we accept them back at all — see below.
        </li>
        <li>Refunds go back to your original payment method. We do not refund to store credit or a different card.</li>
        <li>Custom-printed items are final sale — <em>except</em> when we got them wrong.</li>
      </ul>

      <h2>How to start a return</h2>
      <ol>
        <li>
          Email <a href={`mailto:${site.contact.support}`}>{site.contact.support}</a> with your
          order number and what you want to return.
        </li>
        <li>
          We reply {site.contact.responseTime} with a return address and an RMA number. Do not
          ship anything back before you have that number — unlabelled returns are very hard to
          match to an order.
        </li>
        <li>
          Pack the item securely, write the RMA number on the outside, and send it with a tracked
          service within <strong>{P.rmaValidDays} days</strong> of the RMA being issued. Keep the
          tracking number — <strong>proof of delivery back to us is your responsibility</strong>,
          and we cannot refund a parcel that never arrives.
        </li>
        <li>
          We inspect on arrival and refund within <strong>3 business days</strong>. Your bank may
          take a further 5–10 days to show it.
        </li>
      </ol>
      <p>
        Returns arriving without an RMA number, after the {P.rmaValidDays}-day window, or in a
        condition that does not match what was described, may be refused or refunded in part. We
        will always email you photographs and an explanation before we do either — you will never
        find out by seeing a smaller number than you expected.
      </p>

      <h2>What we refund</h2>
      <table>
        <thead>
          <tr><th>Situation</th><th>You get back</th><th>Return postage</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Changed your mind</td>
            <td>Item price</td>
            <td>Paid by you</td>
          </tr>
          <tr>
            <td>Faulty, damaged or misprinted</td>
            <td>Item price + original shipping</td>
            <td><strong>Paid by us</strong></td>
          </tr>
          <tr>
            <td>We sent the wrong item</td>
            <td>Item price + original shipping</td>
            <td><strong>Paid by us</strong></td>
          </tr>
          <tr>
            <td>Order cancelled before dispatch</td>
            <td>Everything</td>
            <td>Not applicable</td>
          </tr>
        </tbody>
      </table>
      <p>
        Original shipping on a change-of-mind return is not refunded, because we have already paid
        the carrier. If your order shipped free because it was over{" "}
        {money(P.freeShippingThreshold)}, and returning items drops it below that threshold, we
        deduct the {money(P.shippingFlatRate)} flat rate from the refund.
      </p>

      <h2>Restocking fee on opened consumables</h2>
      <p>
        Film, powder and ink that has been opened cannot go back on the shelf as new. Where we
        agree to accept an opened consumable back at all — as a goodwill exception, not as a
        right — the refund is the item price less a <strong>{P.restockingFeePct}% restocking
        fee</strong>, because the stock is written off.
      </p>
      <p>
        This never applies to a sealed item, and it never applies when the fault is ours. If the
        product is defective, contaminated, mislabelled or not what you ordered, you get the full
        amount back and we pay the postage both ways.
      </p>

      <h2>What cannot be returned</h2>
      <ul>
        <li>
          <strong>Custom-printed and personalised items.</strong> We printed your artwork; nobody
          else can use it. The exception below matters, so read it.
        </li>
        <li>
          <strong>Opened ink, powder and film.</strong> Consumables cannot be resold once the seal
          is broken, and contamination is a real risk for the next customer.
        </li>
        <li>
          <strong>Pierced jewelry that has been worn</strong> — nose studs, nose rings and
          earrings. This is a hygiene rule, not a commercial one, and we cannot make exceptions.
        </li>
        <li>Items returned after {P.returnWindowDays} days, or without an RMA number.</li>
        <li>
          Items damaged after delivery — dropped, misused, run through a press at the wrong
          temperature, or stored somewhere hot or damp.
        </li>
        <li>
          Free items and gifts-with-purchase. If the qualifying item goes back, the free item goes
          back with it or its value is deducted.
        </li>
      </ul>

      <h3>The exception that always applies</h3>
      <p>
        <strong>
          If an item is faulty, damaged in transit, or does not match what you ordered, we replace
          or refund it — including custom prints, opened consumables and pierced jewelry.
        </strong>{" "}
        &ldquo;Final sale&rdquo; protects us from buyer&rsquo;s remorse on a personalised
        product. It is not a licence to send you something defective and keep your money. Send
        photographs and we will sort it.
      </p>

      <h2>Custom printing and proofs</h2>
      <p>
        Every custom job is proofed before we press it. Once you approve a proof, that approval is
        what we print — so please read proofs carefully, especially spelling, dates and names. If
        the finished item matches the approved proof, it is not returnable. If it does not match
        the proof, that is our error and we fix it at our cost.
      </p>

      <h2>Wholesale and multi-pack lots</h2>
      <p>
        Multi-pair earring lots, nose ring packs and ring assortments are sold as mixed
        assortments. Designs and colours vary between packs and the photographs are
        representative rather than exact. Variation within an assortment is not a defect. Missing
        pieces or broken items are.
      </p>

      <h2>Refused and undeliverable parcels</h2>
      <p>
        If a parcel is refused at the door, or comes back to us because the address was wrong or
        nobody collected it from the depot, we refund the item price less the outbound shipping we
        actually paid — including on orders that shipped free, where that cost was ours rather
        than nothing. Ask us to send it again and it ships at the normal rate. This is not a
        penalty; it is the carrier&rsquo;s bill, which does not go away because the parcel came
        back.
      </p>

      <h2>Cancelling an order</h2>
      <p>
        Email us as soon as possible. If we have not printed a shipping label yet, we cancel and
        refund in full, no questions. Once a label is printed the order is on its way and becomes
        a return.
      </p>
    </PolicyLayout>
  );
}
