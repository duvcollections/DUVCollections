import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { CartProvider } from "@/lib/cart";
import { getProducts } from "@/lib/catalog";
import { site } from "@/lib/site";

/**
 * Organization structured data. This is what lets Google show your business
 * name, logo and contact details rather than guessing them — and it is one of
 * the things small stores almost always skip.
 */
const orgLd = {
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  name: site.name,
  legalName: site.legalName,
  url: site.url,
  logo: `${site.url}/brand/icon/duv-mark-512.png`,
  email: site.contact.support,
  foundingDate: site.founded,
  areaServed: "US",
  currenciesAccepted: "USD",
  paymentAccepted: "Credit Card, Debit Card, Apple Pay, Google Pay",
  sameAs: [site.external.ebay],
};

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  // Only the fields the cart needs — the full catalogue never ships to the browser.
  const catalog = (await getProducts()).map((p) => ({
    sku: p.sku,
    slug: p.slug,
    title: p.title,
    price: p.price,
    category: p.category,
    art: p.art,
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
      />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <CartProvider catalog={catalog}>
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <ChatWidget />
      </CartProvider>
    </>
  );
}
