import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { site } from "@/lib/site";

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
 * Root layout: document shell only.
 *
 * The shop chrome (header, footer, cart) lives in `(shop)/layout.tsx` and the
 * admin has its own. Keeping them apart is why /admin no longer renders a
 * storefront nav and a Cart button above the dashboard — and why admin pages
 * no longer load the whole catalogue just to hydrate a cart nobody uses there.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${gabarito.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
