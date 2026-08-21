"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Outcome = { ref: string; ok: boolean; emailed: boolean; detail: string };
type Problem = { line: number; text: string; reason: string };

export function ImportTracking() {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<Outcome[] | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOutcomes(null);
    setProblems([]);
    try {
      const res = await fetch("/api/admin/import-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, notify }),
      });
      const d = (await res.json()) as {
        ok?: boolean; error?: string; outcomes?: Outcome[]; problems?: Problem[];
      };
      setProblems(d.problems ?? []);
      if (!res.ok || !d.ok) setError(d.error ?? `Failed (${res.status}).`);
      else {
        setOutcomes(d.outcomes ?? []);
        setCsv("");
        router.refresh();
      }
    } catch {
      setError("Couldn't reach the server. Try again.");
    }
    setBusy(false);
  }

  const done = outcomes?.filter((o) => o.ok).length ?? 0;
  const failed = outcomes?.filter((o) => !o.ok).length ?? 0;

  return (
    <form onSubmit={submit} className="rounded-2xl border border-duv-line bg-white p-6">
      <h2 className="font-display text-lg font-extrabold tracking-tight">
        2. Bring the tracking numbers back
      </h2>
      <p className="mt-1.5 max-w-[64ch] text-[13.5px] leading-relaxed text-duv-muted">
        In Pirate Ship, open <strong className="text-duv-plum">Ships</strong> and export the batch,
        then paste it below. Column order doesn&rsquo;t matter — it finds the reference and the
        tracking number by shape. Orders already marked shipped are left alone, so re-pasting the
        same file can&rsquo;t email anyone twice.
      </p>

      <textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        rows={7}
        placeholder={"Order ID,Tracking\nA1B2C3D4E5F6,9400111899223197428490\n7G8H9I0J1K2L,1Z999AA10123456784"}
        className="mt-4 w-full rounded-xl border border-duv-line bg-white px-3.5 py-3 font-mono text-[13px] focus:border-duv-violet focus:outline-none"
      />

      <label className="mt-3 flex items-start gap-2.5 text-[13.5px]">
        <input
          type="checkbox"
          checked={notify}
          onChange={(e) => setNotify(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#FF2E93]"
        />
        <span className="text-duv-muted">
          Email every customer their tracking link
        </span>
      </label>

      <button
        type="submit"
        disabled={busy || !csv.trim()}
        className="mt-5 rounded-full bg-duv-plum px-7 py-3.5 text-[14.5px] font-bold text-white transition-colors hover:bg-duv-violet disabled:bg-duv-faint"
      >
        {busy ? "Importing…" : "Import tracking"}
      </button>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-duv-red/10 px-4 py-3 text-[13.5px] leading-relaxed text-duv-red">
          {error}
        </p>
      )}

      {outcomes && (
        <div className="mt-5">
          <p className="text-[14px] font-bold">
            {done} order(s) updated{failed > 0 ? `, ${failed} failed` : ""}.
          </p>
          <ul className="mt-3 divide-y divide-duv-line rounded-xl border border-duv-line">
            {outcomes.map((o) => (
              <li key={o.ref} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5 text-[13px]">
                <span className="font-mono font-bold">{o.ref}</span>
                <span className={o.ok ? "text-duv-muted" : "text-duv-red"}>{o.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {problems.length > 0 && (
        <div className="mt-5 rounded-xl bg-duv-amber/12 p-4">
          <p className="text-[13.5px] font-bold text-duv-plum">
            {problems.length} row(s) I couldn&rsquo;t read — nothing was skipped silently:
          </p>
          <ul className="mt-2 space-y-1.5 text-[12.5px] leading-relaxed text-duv-plum/80">
            {problems.map((p) => (
              <li key={p.line}>
                <span className="font-mono">Line {p.line}</span> — {p.reason}
                <br />
                <span className="font-mono text-duv-faint">{p.text.slice(0, 90)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
