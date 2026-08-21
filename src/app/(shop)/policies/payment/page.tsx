import type { Metadata } from "next";
import { PolicyLayout } from "@/components/PolicyLayout";
import { site, money } from "@/lib/site";

export const metadata: Metadata = {
  title: "Payment Policy",
  description:
    "How payments work at DUV Collections: Stripe-hosted checkout, no card data on our servers, clear pricing and sales tax, and how chargebacks are handled.",
};

export default function Payment() {
  return (
    <PolicyLayout
      current="/policies/payment"
      title="Payment Policy"
      lede="What we charge, when we charge it, and exactly who touches your card details. The short answer to the last one: not us."
    >

      <h2>How we take payment</h2>
      <p>
        Checkout is handled by <strong>Stripe</strong>, a PCI DSS Level 1 certified payment
        processor — the highest certification level that exists. When you pay, your card details
        go directly from your browser to Stripe over an encrypted connection.
      </p>
      <p>
        <strong>
          Your full card number, expiry date and CVV never reach our servers, and we could not
          retrieve them if we wanted to.
        </strong>{" "}
        What we receive back from Stripe is a confirmation that payment succeeded, the last four
        digits, and the card brand — enough to help you with a query, and nothing more. This is a
        deliberate design decision: data we never hold cannot be stolen from us.
      </p>

      <h2>What we accept</h2>
      <ul>
        <li>Visa, Mastercard, American Express and Discover — credit and debit</li>
        <li>Apple Pay and Google Pay</li>
        <li>Any other method Stripe enables for your region at checkout</li>
      </ul>
      <p>
        We do not accept cash, cheques, wire transfers, gift cards or cryptocurrency. For
        wholesale orders on account terms, email{" "}
        <a href={`mailto:${site.contact.sales}`}>{site.contact.sales}</a>.
      </p>

      <h2>Currency and pricing</h2>
      <p>
        All prices are in <strong>US dollars (USD)</strong>. Prices shown on product pages exclude
        shipping and sales tax, both of which are calculated and shown before you confirm payment.
      </p>
      <p>
        If you pay with a card issued outside the US, your bank may apply a foreign transaction
        fee and its own exchange rate. That fee is between you and your bank; we never see it and
        cannot refund it.
      </p>

      <h2>No hidden fees</h2>
      <p>
        We charge for the goods, shipping, and sales tax where legally required. That is the
        entire list. There is no handling fee, no card surcharge, no service charge, and no
        &ldquo;processing&rdquo; line added at the final step. The total shown on the last screen
        before you pay is the total that will appear on your statement.
      </p>

      <h2>Sales tax</h2>
      <p>
        US sales tax is calculated automatically at checkout using Stripe Tax, based on your
        delivery address and the tax rules that apply to what you have bought. Rates differ by
        state, county and city, which is why tax cannot be shown until you enter an address.
      </p>
      <p>
        If your business is tax-exempt and you buy for resale, email us your resale certificate{" "}
        <em>before</em> ordering and we will arrange an exempt purchase. We cannot refund tax
        after an order has been placed.
      </p>

      <h2>When you are charged</h2>
      <p>
        Your card is charged when you complete checkout, not when the order ships. If we cannot
        fulfil an order — an item turns out to be out of stock, or an address is undeliverable —
        we refund in full and email you the same day we find out.
      </p>
      <p>
        For custom printing, we take payment when you approve the proof, not when you request the
        quote. Requesting a quote costs nothing and commits you to nothing.
      </p>

      <h2>Failed and declined payments</h2>
      <p>
        If a payment is declined, no order is created and no money moves. Declines usually come
        from your bank, not from us — the common causes are an address mismatch, an expired card,
        or a fraud hold on an unfamiliar merchant. Your bank can tell you which; we cannot, as we
        only receive a generic decline code.
      </p>
      <p>
        You may briefly see a pending authorisation on your statement for a failed attempt. That
        is a hold, not a charge, and your bank releases it automatically — typically within 5
        business days.
      </p>

      <h2>Refunds</h2>
      <p>
        Refunds are issued to the original payment method. We cannot send a refund to a different
        card or account. Once we process it, the money leaves us immediately, but your bank
        usually takes <strong>5–10 business days</strong> to post it. See the{" "}
        <a href="/policies/returns">Returns &amp; Refunds policy</a> for what qualifies.
      </p>

      <h2>Order confirmation</h2>
      <p>
        Every successful payment produces an emailed confirmation with an order number, an
        itemised list, the shipping and tax you paid, and the total. Keep it — it is your receipt.
        If it has not arrived within an hour, check your spam folder and then contact us.
      </p>

      <h2>Chargebacks and disputes</h2>
      <p>
        If something is wrong with your order, please email us first. We can almost always resolve
        it faster than a bank dispute, which takes weeks and helps nobody.
      </p>
      <p>
        We take fraud seriously in both directions. We respond to every chargeback with the order
        record, the carrier&rsquo;s delivery scan, the IP and timestamp of the order, and the
        signed proof approval for custom jobs. Where a chargeback is filed on goods that were
        delivered as described, we contest it with that evidence, and we may decline future
        orders from that account and that address.
      </p>
      <p>
        Filing a dispute instead of asking us does not get you a faster answer — it freezes the
        order for weeks while a bank reads paperwork. Raising it with us first costs you nothing
        and keeps every option open, including the dispute.
      </p>
      <p>
        We may cancel and refund an order before dispatch where the billing and shipping details
        do not match, where an address fails verification, or where the order pattern matches
        known card testing. This is rare, it is never personal, and you get every cent back.
      </p>

      <h2>Pricing errors</h2>
      <p>
        We are a small team and mistakes occasionally reach the site. If an item is listed at an
        obviously incorrect price, we reserve the right to cancel the order and refund you in
        full rather than fulfil it. We will always contact you first, and we will never charge
        you more than the price you agreed to at checkout.
      </p>

      <h2>Free shipping threshold</h2>
      <p>
        Orders of {money(site.policy.freeShippingThreshold)} or more (before tax) ship free within
        the US. Below that, shipping is a flat {money(site.policy.shippingFlatRate)}. Full detail
        in the <a href="/policies/shipping">Shipping Policy</a>.
      </p>
    </PolicyLayout>
  );
}
