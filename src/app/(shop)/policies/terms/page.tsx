import type { Metadata } from "next";
import { PolicyLayout } from "@/components/PolicyLayout";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms that govern buying from DUV Collections — orders, pricing, custom printing, artwork rights, liability and dispute resolution.",
};

export default function Terms() {
  const state = site.governingState.startsWith("TODO")
    ? "[STATE OF FORMATION]"
    : site.governingState;

  return (
    <PolicyLayout
      current="/policies/terms"
      title="Terms & Conditions"
      lede="The agreement between you and us when you buy something. Written to be read, not to be impenetrable."
    >

      <h2>1. Who these terms are with</h2>
      <p>
        These terms are between you and <strong>{site.legalName}</strong> (&ldquo;we&rdquo;,
        &ldquo;us&rdquo;), a limited liability company organised in {state}, trading as{" "}
        {site.name} at duvcollections.com. By placing an order you accept them.
      </p>

      <h2>2. Who may buy</h2>
      <p>
        You must be at least 18, or have a parent or guardian&rsquo;s permission, and be able to
        enter a binding contract. You must give accurate information at checkout — particularly
        your shipping address.
      </p>

      <h2>3. Orders</h2>
      <p>
        A listing is an invitation to buy, not a binding offer. Your order is an offer to
        purchase. A contract forms when we send your dispatch confirmation, not when you pay.
      </p>
      <p>We may decline or cancel an order, refunding you in full, if:</p>
      <ul>
        <li>the item is out of stock or has been discontinued;</li>
        <li>the listed price was obviously incorrect;</li>
        <li>we cannot verify the billing or shipping details;</li>
        <li>we suspect fraud or a resale that breaches these terms;</li>
        <li>the delivery address is outside the areas we ship to.</li>
      </ul>

      <h2>4. Prices</h2>
      <p>
        Prices are in US dollars and may change without notice, but never after you have paid —
        the price at checkout is the price you pay. Prices exclude shipping and sales tax, both of
        which are shown before you confirm. See the{" "}
        <a href="/policies/payment">Payment Policy</a>.
      </p>

      <h2>5. Product descriptions and colour</h2>
      <p>
        We describe products as accurately as we can. Two honest caveats:
      </p>
      <ul>
        <li>
          <strong>Colour varies between screens.</strong> No two monitors render a gold plating or
          a glitter film identically. A slight difference between screen and item is not a defect.
        </li>
        <li>
          <strong>Assorted lots vary.</strong> Multi-pair earring packs, ring assortments and nose
          ring lots contain mixed designs. Photographs show a representative selection, not the
          exact pieces you will receive.
        </li>
      </ul>
      <p>
        &ldquo;Gold plated&rdquo; means a base metal with a gold-coloured plated finish. It is not
        solid gold and is not sold as such. Plating wears with time and exposure to water,
        perfume and friction.
      </p>

      <h2>6. Custom printing</h2>
      <h3>6.1 Your artwork</h3>
      <p>
        By sending us artwork you confirm that you own it or have permission to reproduce it, and
        that it does not infringe anyone&rsquo;s copyright, trademark or likeness rights. You
        agree to indemnify us against claims arising from artwork you supplied.
      </p>
      <p>
        <strong>We will decline jobs</strong> that reproduce third-party logos or characters
        without evident authorisation, that depict hate symbols or incite violence, that are
        sexually explicit, or that appear designed to defraud. This is not editorial preference —
        it is what keeps our printing business insurable.
      </p>

      <h3>6.2 Who owns what</h3>
      <p>
        You keep every right in the artwork you send us. We claim no ownership of it. We use it
        only to produce your order, and we will not print it for anyone else or display it as a
        sample without asking you first.
      </p>

      <h3>6.3 Proofs</h3>
      <p>
        We send a digital proof before printing. Approving it means the artwork, spelling,
        placement and colours are correct. <strong>Once approved, we print exactly that.</strong>{" "}
        Errors present in an approved proof are not returnable. Errors we introduce after approval
        are ours and we fix them free.
      </p>

      <h2>7. Wholesale and resale</h2>
      <p>
        You may resell goods bought here. You may not present yourself as an authorised dealer,
        agent or franchisee of {site.name}, and you may not use our name, logo or product
        photography to imply we endorse your business.
      </p>

      <h2>8. Using this website</h2>
      <p>You agree not to:</p>
      <ul>
        <li>scrape, mirror or bulk-copy the site or its catalogue;</li>
        <li>probe, scan or attempt to breach its security;</li>
        <li>upload malware, or files disguised as images or artwork;</li>
        <li>place fraudulent or automated orders;</li>
        <li>interfere with anyone else&rsquo;s use of the site.</li>
      </ul>
      <p>
        The site&rsquo;s design, text, logo and photography are ours and are protected by
        copyright and trademark law.
      </p>

      <h2>9. Accounts</h2>
      <p>
        Keep your password to yourself; you are responsible for activity under your account. Tell
        us immediately if you think it has been compromised. We may suspend an account used for
        fraud or abuse.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        To the fullest extent the law allows, our total liability for any claim connected to an
        order is limited to <strong>the amount you paid for that order</strong>.
      </p>
      <p>
        We are not liable for indirect or consequential loss — including lost profits, lost
        production time, or damage caused by misusing a product. Heat presses, transfer films and
        pigment inks require correct temperature, pressure and timing; results depend on your
        equipment and technique, which we cannot control or supervise.
      </p>
      <p>
        Nothing here excludes liability that cannot lawfully be excluded, including for death or
        personal injury caused by our negligence, or for fraud. Some states do not allow the
        exclusion of certain warranties or incidental damages, so parts of this section may not
        apply to you — and where your state&rsquo;s law gives you more, your state&rsquo;s law
        wins.
      </p>
      <p>
        Any claim connected to an order must be brought within <strong>one year</strong> of the
        order date, except where your state sets a longer period that cannot be shortened by
        agreement.
      </p>

      <h2>11. Warranty</h2>
      <p>
        We warrant that goods will arrive as described and free from manufacturing defects. Beyond
        that, and beyond what your state&rsquo;s law provides, products are supplied &ldquo;as
        is&rdquo; without further warranty of fitness for a particular purpose. Test consumables
        on a sample before committing to a production run.
      </p>

      <h2>12. Events outside our control</h2>
      <p>
        We are not liable for delays caused by things we cannot control — carrier disruption,
        severe weather, supplier failure, utility or network outages, or government action. If
        such an event materially delays your order we will tell you and you may cancel for a full
        refund.
      </p>

      <h2>13. Governing law and disputes</h2>
      <p>
        These terms are governed by the laws of the State of {state}, without regard to its
        conflict-of-laws rules.
      </p>

      <h3>13.1 Talk to us first</h3>
      <p>
        Before starting any formal process, email{" "}
        <a href={`mailto:${site.contact.support}`}>{site.contact.support}</a> and give us{" "}
        <strong>30 days</strong> to put it right. Almost every problem we have ever had was
        resolved this way in a day, and this step is a condition of the two that follow.
      </p>

      <h3>13.2 Binding arbitration</h3>
      <p>
        <strong>
          If we cannot resolve it, you and we agree that the dispute will be settled by binding
          individual arbitration rather than in court.
        </strong>{" "}
        Arbitration is run by the American Arbitration Association under its Consumer Arbitration
        Rules, seated in {state} or conducted remotely at your choice, and the arbitrator&rsquo;s
        decision is final. Because this clause gives up your right to a judge and a jury, read it
        before you buy.
      </p>
      <p>
        Two things are carved out and always remain available to either of us: any claim that can
        be brought in <strong>small claims court</strong>, and any request for an injunction to
        stop misuse of intellectual property. Where the AAA rules make us responsible for the
        filing fee on a consumer claim, we pay it.
      </p>
      <p>
        <strong>You can opt out.</strong> Email{" "}
        <a href={`mailto:${site.contact.support}`}>{site.contact.support}</a> with the words
        &ldquo;arbitration opt-out&rdquo; and your order number within{" "}
        <strong>30 days</strong> of your first order, and this section will not apply to you. It
        costs you nothing and we will not treat you differently for it.
      </p>

      <h3>13.3 Where claims are brought</h3>
      <p>
        For anything not covered by arbitration, the state and federal courts located in {state}
        have exclusive jurisdiction, and both of us consent to that.
      </p>

      <h2>14. Acceptance</h2>
      <p>
        Placing an order means you accept these terms and the Privacy, Payment, Shipping and
        Returns policies as they stood at that moment. We show a link to all of them at checkout
        so nobody can reasonably say they never saw them.
      </p>

      <h2>15. Changes to these terms</h2>
      <p>
        We may update these terms. The version in force for your order is the one published when
        you placed it, and changes are never applied retroactively. The current version is dated
        in the sidebar.
      </p>

      <h2>16. Severability and entire agreement</h2>
      <p>
        If any provision is found unenforceable, it is limited or removed to the minimum extent
        needed and the rest stays in force. Failing to enforce a term on one occasion is not a
        waiver of it. You may not transfer your rights under these terms to someone else without
        our written agreement; we may transfer ours if the business is sold, without changing
        what you are owed. These terms, together with the Privacy, Payment, Shipping and Returns
        policies, are the entire agreement between us regarding your purchase, and they replace
        anything said in an email, a listing or a conversation beforehand.
      </p>
    </PolicyLayout>
  );
}
