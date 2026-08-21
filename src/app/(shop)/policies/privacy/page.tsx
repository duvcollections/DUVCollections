import type { Metadata } from "next";
import { PolicyLayout } from "@/components/PolicyLayout";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Exactly what data DUV Collections collects, which processors handle it, how long we keep it, and how to have it deleted.",
};

export default function Privacy() {
  return (
    <PolicyLayout
      current="/policies/privacy"
      title="Privacy Policy"
      lede="Written against the systems this site actually runs on, not copied from a template. Every processor named below is one we genuinely use."
    >

      <h2>Who we are</h2>
      <p>
        <strong>{site.legalName}</strong>, trading as {site.name}, operating{" "}
        <a href={site.url}>duvcollections.com</a>. We are the data controller for the information
        described here. Contact us at{" "}
        <a href={`mailto:${site.contact.support}`}>{site.contact.support}</a>.
      </p>

      <h2>What we collect, and why</h2>
      <table>
        <thead>
          <tr><th>Data</th><th>Why we need it</th><th>Where it lives</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Name, email, shipping and billing address</td>
            <td>To take payment, ship your order and email you tracking</td>
            <td>Our database and Stripe</td>
          </tr>
          <tr>
            <td>Order contents and history</td>
            <td>To fulfil orders, handle returns and meet tax record-keeping duties</td>
            <td>Our database</td>
          </tr>
          <tr>
            <td>Payment card details</td>
            <td>To take payment</td>
            <td><strong>Stripe only — never our servers</strong></td>
          </tr>
          <tr>
            <td>Artwork you upload for custom printing</td>
            <td>To produce your order</td>
            <td>Private storage, not publicly listable</td>
          </tr>
          <tr>
            <td>Aggregate page views</td>
            <td>To see which products people look at</td>
            <td>Cloudflare Web Analytics</td>
          </tr>
        </tbody>
      </table>

      <h2>What we do not do</h2>
      <ul>
        <li>
          <strong>We do not sell, rent or trade your personal information.</strong> Not to
          advertisers, not to data brokers, not to anyone.
        </li>
        <li>We do not store your card number, expiry date or CVV. We cannot — see below.</li>
        <li>We do not run third-party advertising trackers or retargeting pixels on this site.</li>
        <li>We do not add you to a marketing list because you bought something.</li>
      </ul>

      <h2>Cookies and analytics</h2>
      <p>
        This site does not use advertising or tracking cookies, which is why you are not being
        asked to dismiss a consent banner.
      </p>
      <p>We use exactly two kinds of browser storage:</p>
      <ul>
        <li>
          <strong>Your cart</strong>, stored in your own browser so it survives a refresh. It
          never leaves your device until you check out.
        </li>
        <li>
          <strong>Cloudflare Web Analytics</strong>, which counts page views without cookies and
          without building a profile of you across sites.
        </li>
      </ul>

      <h2>Who processes your data</h2>
      <p>
        These are the only third parties that touch your information. Each is used for one narrow
        purpose:
      </p>
      <ul>
        <li>
          <strong>Stripe</strong> — payment processing and sales tax calculation. Stripe is the
          controller of your payment data;{" "}
          <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">
            their privacy policy
          </a>{" "}
          applies to it.
        </li>
        <li>
          <strong>Cloudflare</strong> — hosting, security and cookieless analytics.
        </li>
        <li>
          <strong>Supabase</strong> — the database holding orders and accounts.
        </li>
        <li>
          <strong>Resend</strong> — sending order confirmations and tracking emails.
        </li>
        <li>
          <strong>USPS, UPS and other carriers</strong> — your name and address, so they can
          deliver the parcel.
        </li>
      </ul>
      <p>
        We do not authorise any of these to use your information for their own marketing.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>
          <strong>Order records: 7 years.</strong> Not by choice — US tax record-keeping requires
          it.
        </li>
        <li>
          <strong>Custom artwork: 12 months</strong> after the order ships, so we can reprint if
          something goes wrong. Deleted after that, or sooner if you ask.
        </li>
        <li>
          <strong>Account details:</strong> until you ask us to delete them.
        </li>
        <li>
          <strong>Support emails: 2 years.</strong>
        </li>
      </ul>

      <h2>Your rights</h2>
      <p>
        Whatever state you live in, we will honour these requests. Email{" "}
        <a href={`mailto:${site.contact.support}`}>{site.contact.support}</a> and we respond
        within <strong>30 days</strong>:
      </p>
      <ul>
        <li><strong>Access</strong> — a copy of everything we hold about you</li>
        <li><strong>Correction</strong> — fix anything wrong</li>
        <li><strong>Deletion</strong> — erase it, apart from order records we are legally required to keep</li>
        <li><strong>Opt out of sale or sharing</strong> — already the default; we do neither</li>
        <li><strong>Non-discrimination</strong> — exercising any of these never affects your prices or service</li>
      </ul>
      <p>
        California residents have these rights under the CCPA/CPRA. We do not sell or share
        personal information as those laws define it, so there is nothing for you to opt out of.
      </p>

      <h2>Security</h2>
      <p>
        The whole site is served over HTTPS. Payment data is isolated at Stripe. Database access is
        restricted per-account at the database level, so one customer&rsquo;s records cannot be
        read by another. Uploaded artwork sits in private storage that cannot be listed or browsed,
        and is reachable only through short-lived signed links.
      </p>
      <p>
        No system is perfectly secure, and anyone who tells you otherwise is selling something. If
        a breach ever affects your data, we will tell you and the relevant authorities without
        delay rather than quietly hoping you do not notice.
      </p>

      <h2>Children</h2>
      <p>
        This store is not directed at children under 13 and we do not knowingly collect their
        data. If you believe a child has given us personal information, email us and we will
        delete it.
      </p>

      <h2>Marketing email</h2>
      <p>
        We only email you about an order you placed, unless you explicitly opt in to hear about
        new stock. If you do opt in, every message carries a one-click unsubscribe that works
        immediately.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If we change it, we update the date shown in the sidebar. Material changes affecting how we
        use existing data will be emailed to affected customers rather than quietly published.
      </p>
    </PolicyLayout>
  );
}
