import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted so the storefront makes no third-party font request.
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

const SITE = "https://duvcollections.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "DUV Collections — printing supplies, apparel, gifts & jewelry",
    template: "%s · DUV Collections",
  },
  description:
    "DTF films, inks and powders, heat transfer paper, custom printing, men's apparel, " +
    "gift articles and gold-plated jewelry. Shipped from the USA by DUV Prints and Gifts USA LLC.",
  applicationName: "DUV Collections",
  keywords: [
    "DTF transfer film",
    "DTF ink",
    "DTF powder",
    "heat transfer paper",
    "sublimation printing",
    "custom printing",
    "gold plated jewelry",
    "gift articles",
  ],
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "DUV Collections",
    title: "DUV Collections — printing supplies, apparel, gifts & jewelry",
    description:
      "DTF films, inks and powders, custom printing, apparel, gifts and gold-plated jewelry, shipped from the USA.",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/brand/icon/apple-touch-icon-180.png",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#FFFCF8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
