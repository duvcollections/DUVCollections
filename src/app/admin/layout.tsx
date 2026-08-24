import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin, AccessError } from "@/lib/access";
import { Mark } from "@/components/Mark";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/shipping", label: "Shipping" },
  { href: "/admin/sales", label: "Sales" },
  { href: "/admin/discounts", label: "Discounts" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/channels", label: "Channels" },
  { href: "/admin/ebay", label: "eBay" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let who: string;
  try {
    who = (await requireAdmin()).email;
  } catch (err) {
    const message = err instanceof AccessError ? err.message : "Unexpected error.";
    return (
      <main id="main" className="mx-auto max-w-xl px-6 py-24">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Not signed in</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-duv-muted">{message}</p>
        <p className="mt-4 rounded-2xl border border-duv-line bg-white p-5 text-[13.5px] leading-relaxed text-duv-muted">
          This area is protected by Cloudflare Access. If you expected to be signed in already,
          check that the Access application covers <code>duvcollections.com/admin*</code> and that
          your email is in <code>ADMIN_EMAILS</code>.
        </p>
        <Link href="/" className="mt-8 inline-block text-[14px] font-bold text-duv-violet underline underline-offset-4">
          Back to the shop
        </Link>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-duv-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="border-b border-duv-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3.5 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2.5">
            <Mark className="h-7 w-7" />
            <span className="font-display text-[15px] font-extrabold tracking-tight">
              DUV Admin
            </span>
          </Link>
          <nav className="flex flex-wrap gap-1" aria-label="Admin sections">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-full px-3.5 py-2 text-[14px] font-semibold text-duv-muted transition-colors hover:bg-duv-shell hover:text-duv-plum"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4 text-[13px]">
            <span className="text-duv-muted">{who}</span>
            <Link href="/" className="font-semibold text-duv-violet hover:text-duv-pink-ink">
              View shop ↗
            </Link>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {children}
      </main>
    </div>
  );
}
