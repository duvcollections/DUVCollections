"use client";

import { useState } from "react";

type Row = {
  sku?: string;
  reasons?: string[];
  title: string;
  price: number | null;
  images: number;
  firstImage: string | null;
  quantity: number | null;
  url: string;
};

type Result = {
  seller: string;
  total: number;
  truncated: boolean;
  matched: Row[];
  unmatched: Row[];
};

const money = (n: number | null) => (n === null ? "—" : `$${n.toFixed(2)}`);

export function ImportPanel({ defaultSeller }: { defaultSeller: string }) {
  const [seller, setSeller] = useState(defaultSeller);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [tab, setTab] = useState<"matched" | "unmatched">("matched");

  async function scan() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/ebay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seller }),
      });
      const data = (await res.json().catch(() => ({}))) as Result & { error?: string };
      if (!res.ok) setError(data.error ?? `Failed (${res.status}).`);
      else setResult(data);
    } catch {
      setError("Couldn't reach the server.");
    }
    setBusy(false);
  }

  const rows = result ? (tab === "matched" ? result.matched : result.unmatched) : [];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-duv-line bg-white p-6">
        <label className="block">
          <span className="text-[13px] font-bold text-duv-plum">eBay seller name</span>
          <input
            value={seller}
            onChange={(e) => setSeller(e.target.value)}
            className="mt-1.5 w-full max-w-sm rounded-xl border border-duv-line bg-white px-3.5 py-2.5 font-mono text-[14px] focus:border-duv-violet focus:outline-none"
          />
        </label>
        <button
          onClick={scan}
          disabled={busy || !seller.trim()}
          className="mt-4 rounded-full bg-duv-pink-deep px-7 py-3 text-[14px] font-bold text-white hover:bg-duv-coral-deep disabled:opacity-50"
        >
          {busy ? "Reading eBay…" : "Scan my eBay store"}
        </button>
        <p className="mt-3 text-[12.5px] leading-relaxed text-duv-faint-ink">
          Read-only. This looks at your listings and reports what an import would do —
          it changes nothing.
        </p>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-duv-coral/15 px-4 py-3 text-[13.5px] font-semibold text-duv-coral">
            {error}
          </p>
        )}
      </div>

      {result && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Listings found", value: String(result.total) },
              { label: "Matched to a SKU", value: String(result.matched.length) },
              { label: "No match yet", value: String(result.unmatched.length) },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-duv-line bg-white p-5">
                <p className="font-display text-[28px] font-extrabold leading-none tabular-nums">
                  {s.value}
                </p>
                <p className="mt-2 text-[13px] text-duv-muted">{s.label}</p>
              </div>
            ))}
          </div>

          {result.truncated && (
            <p className="rounded-2xl bg-tint-jewelry px-5 py-4 text-[13.5px] text-duv-plum">
              More listings exist than were read in one pass. The first {result.total} are shown.
            </p>
          )}

          <div className="flex gap-2">
            {(["matched", "unmatched"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                aria-current={tab === t ? "true" : undefined}
                className={`rounded-full border px-4 py-2 text-[13.5px] font-semibold ${
                  tab === t
                    ? "border-duv-plum bg-duv-plum text-white"
                    : "border-duv-line bg-white text-duv-muted hover:border-duv-violet"
                }`}
              >
                {t === "matched" ? "Matched" : "Unmatched"}{" "}
                <span className={tab === t ? "text-white/70" : "text-duv-faint-ink"}>
                  {t === "matched" ? result.matched.length : result.unmatched.length}
                </span>
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-3xl border border-duv-line bg-white">
            {rows.length === 0 ? (
              <p className="px-6 py-10 text-center text-[14px] text-duv-muted">Nothing here.</p>
            ) : (
              <ul className="divide-y divide-duv-line">
                {rows.map((r, i) => (
                  <li key={i} className="flex flex-wrap items-start gap-4 px-5 py-4">
                    {r.firstImage ? (
                      // eslint-disable-next-line @next/next/no-img-element -- remote eBay CDN, not part of our asset pipeline
                      <img
                        src={r.firstImage}
                        alt=""
                        width={56}
                        height={56}
                        className="h-14 w-14 shrink-0 rounded-lg border border-duv-line object-contain"
                      />
                    ) : (
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-duv-line text-[11px] text-duv-faint-ink">
                        no img
                      </span>
                    )}

                    <div className="min-w-[16rem] flex-1">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[14px] font-semibold text-duv-plum underline-offset-2 hover:underline"
                      >
                        {r.title}
                      </a>
                      {r.sku && (
                        <p className="mt-1 text-[12.5px] text-duv-muted">
                          → <span className="font-mono font-bold text-duv-plum">{r.sku}</span>
                          {r.reasons?.length ? ` · ${r.reasons.join(" · ")}` : ""}
                        </p>
                      )}
                    </div>

                    <div className="text-right text-[13px] tabular-nums">
                      <p className="font-display font-extrabold">{money(r.price)}</p>
                      <p className="text-duv-faint-ink">
                        {r.images} photo{r.images === 1 ? "" : "s"}
                        {r.quantity !== null && ` · qty ${r.quantity}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
