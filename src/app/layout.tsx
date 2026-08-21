import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartProvider } from "@/lib/cart";
import { site } from "@/lib/site";
import { getProducts } from "@/lib/catalog";

// Self-hosted: the storefront makes no third-party font request, which keeps
// the page fast and keeps visitor IPs off someone else's server.
const jakarta = localFont({
  variable: "--font-jakarta",
  display: "swap",
  src: [
    { path: "../fonts/PlusJakartaSans-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/PlusJakartaSans-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/PlusJakartaSans-700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/PlusJakartaSans-800.woff2", weight: "800", style: "normal" },
  ],
});

const gabarito = localFont({
  variable: "--font-gabarito",
  display: "swap",
  src: [
    { path: "../fonts/Gabarito-700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/Gabarito-800.woff2", weight: "800", style: "normal" },
    { path: "../fonts/Gabarito-900.woff2", weight: "900", style: "normal" },
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description:
    "DTF transfer film, pigment ink and hot-melt powder, heat transfer paper, custom printing, " +
    "gold-plated jewelry and sunglasses. Shipped from the USA by DUV Prints and Gifts USA LLC.",
  applicationName: site.name,
  openGraph: {
    type: "website",
    url: site.url,
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description:
      "DTF supplies, custom printing, gold-plated jewelry and gifts. Shipped from the USA.",
  },
  icons: { icon: "/favicon.ico", apple: "/brand/icon/apple-touch-icon-180.png" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#FFFCF8",
  width: "device-width",
  initialScale: 1,
};

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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
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
    <html lang="en" className={`${jakarta.variable} ${gabarito.variable}`}>
      <body className="font-sans antialiased">
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
        </CartProvider>
      </body>
    </html>
  );
}
