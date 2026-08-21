import { isAdmin } from "@/lib/access";
import { site } from "@/lib/site";
import { ImportPanel } from "./ImportPanel";

export const metadata = { title: "eBay import" };
export const dynamic = "force-dynamic";

export default async function EbayPage() {
  if (!(await isAdmin())) return null;

  const seller = site.external.ebay.split("/str/")[1]?.split(/[/?]/)[0] ?? "";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em]">eBay import</h1>
        <p className="mt-2 max-w-[70ch] text-[14.5px] leading-relaxed text-duv-muted">
          Reads your live eBay listings and works out which ones correspond to products here.
          Matching is deliberately cautious — a listing pairs only when its title carries the
          SKU, or when the titles and prices both agree. Everything else is listed as unmatched
          for you to judge.
        </p>
      </header>

      <ImportPanel defaultSeller={seller} />

      <section className="rounded-2xl border border-duv-line bg-white p-6">
        <h2 className="font-display text-[15px] font-extrabold tracking-tight">Before this works</h2>
        <ol className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-duv-muted">
          <li>
            1. Create an application at{" "}
            <a
              href="https://developer.ebay.com/my/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-duv-violet underline underline-offset-2"
            >
              developer.ebay.com
            </a>{" "}
            and copy the production App ID and Cert ID.
          </li>
          <li>
            2. Add them as Worker secrets named <code className="font-mono">EBAY_CLIENT_ID</code>{" "}
            and <code className="font-mono">EBAY_CLIENT_SECRET</code>.
          </li>
          <li>3. Push a commit so a fresh build picks the secrets up, then scan.</li>
        </ol>
      </section>
    </div>
  );
}
