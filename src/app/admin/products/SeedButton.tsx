"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** One-time copy of the bundled seed file into D1. Safe to run twice. */
export function SeedButton({ count }: { count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="mt-6 rounded-2xl border border-duv-line bg-white p-5">
      <p className="text-[13.5px] text-duv-muted">
        Database connected. If the catalogue is empty, load the {count} bundled products into it.
        Existing products are never overwritten.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg(null);
          const res = await fetch("/api/admin/product", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "seed" }),
          });
          const d = (await res.json()) as { inserted?: number; error?: string };
          setMsg(d.error ? `Failed: ${d.error}` : `Added ${d.inserted ?? 0} product(s).`);
          setBusy(false);
          router.refresh();
        }}
        className="mt-3 rounded-full border-2 border-duv-plum px-5 py-2 text-[13.5px] font-bold text-duv-plum hover:border-duv-violet hover:text-duv-violet disabled:opacity-50"
      >
        {busy ? "Loading…" : "Load seed catalogue"}
      </button>
      {msg && <p className="mt-3 text-[13px] font-semibold text-duv-plum">{msg}</p>}
    </div>
  );
}
