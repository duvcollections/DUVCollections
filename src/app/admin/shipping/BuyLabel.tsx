"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PARCEL_PRESETS, type ShippoRate } from "@/lib/shippo";

type Props = {
  id: string;
  ref_: string;
  suggestedPresetId: string;
  suggestedWeightOz: number | null;
  connected: boolean;
};

const field =
  "w-full rounded-xl border border-duv-line bg-white px-3 py-2 text-[14px] focus:border-duv-violet focus:outline-none";

const money = (n: number) => `$${n.toFixed(2)}`;

/**
 * Rate shopping and label purchase for one order.
 *
 * Nothing here spends money until you press Buy on a specific rate, and the
 * exact amount is on the button. That is deliberate — a "buy cheapest" shortcut
 * saves three seconds and eventually buys the wrong service on the one order
 * where it mattered.
 */
export function BuyLabel({ id, ref_, suggestedPresetId, suggestedWeightOz, connected }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [presetId, setPresetId] = useState(suggestedPresetId);
  const [weight, setWeight] = useState(suggestedWeightOz ? String(suggestedWeightOz) : "");
  const [rates, setRates] = useState<ShippoRate[] | null>(null);
  const [busy, setBusy] = useState<"rates" | string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ tracking: string; carrier: string; labelUrl: string | null; note: string } | null>(null);

  const preset = PARCEL_PRESETS.find((p) => p.id === presetId) ?? PARCEL_PRESETS[0];

  async function fetchRates() {
    setBusy("rates");
    setError(null);
    setRates(null);
    try {
      const res = await fetch("/api/admin/shippo/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          parcel: { ...preset.parcel, weightOz: Number(weight) },
        }),
      });
      const d = (await res.json()) as { ok?: boolean; rates?: ShippoRate[]; error?: string };
      if (!res.ok || !d.ok) setError(d.error ?? `Couldn't get rates (${res.status}).`);
      else setRates(d.rates ?? []);
    } catch {
      setError("Couldn't reach the server.");
    }
    setBusy(null);
  }

  async function buy(rate: ShippoRate) {
    setBusy(rate.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/shippo/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, rateId: rate.id, notify: true }),
      });
      const d = (await res.json()) as {
        ok?: boolean; error?: string; warning?: string; emailed?: boolean; emailError?: string | null;
        label?: { tracking: string; carrier: string; labelUrl: string | null; amount: number };
      };
      if (!res.ok || !d.ok || !d.label) {
        setError(d.error ?? `Purchase failed (${res.status}).`);
      } else {
        setDone({
          tracking: d.label.tracking,
          carrier: d.label.carrier,
          labelUrl: d.label.labelUrl,
          note: d.warning
            ? d.warning
            : d.emailed
              ? "Customer emailed their tracking link."
              : d.emailError
                ? `Email failed: ${d.emailError}`
                : "No email sent.",
        });
        setRates(null);
        router.refresh();
      }
    } catch {
      setError("Couldn't reach the server. Check Shippo before retrying — the label may have been bought.");
    }
    setBusy(null);
  }

  if (done) {
    return (
      <div className="rounded-xl bg-duv-mint/20 p-4 text-[13px]">
        <p className="font-bold text-duv-green">
          {done.carrier} {done.tracking}
        </p>
        <p className="mt-1 text-duv-plum/80">{done.note}</p>
        {done.labelUrl && (
          <a
            href={done.labelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded-full bg-duv-plum px-5 py-2 text-[13px] font-bold text-white hover:bg-duv-violet"
          >
            Print label (PDF)
          </a>
        )}
      </div>
    );
  }

  if (!connected) {
    return (
      <p className="text-[12.5px] leading-relaxed text-duv-faint">
        Add <code className="font-mono">SHIPPO_API_KEY</code> to buy labels here. Until then use the
        CSV export below.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border-2 border-duv-plum px-5 py-2 text-[13.5px] font-bold text-duv-plum transition-colors hover:border-duv-violet hover:text-duv-violet"
      >
        Get rates
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-duv-line bg-duv-shell p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto] sm:items-end">
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wide text-duv-faint">Box</span>
          <select value={presetId} onChange={(e) => setPresetId(e.target.value)} className={field}>
            {PARCEL_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} · {p.parcel.lengthIn}×{p.parcel.widthIn}×{p.parcel.heightIn} in
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wide text-duv-faint">Weight (oz)</span>
          <input
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            inputMode="numeric"
            placeholder="—"
            className={`${field} font-mono`}
          />
        </label>
        <button
          type="button"
          onClick={fetchRates}
          disabled={busy !== null || !Number(weight)}
          className="rounded-full bg-duv-plum px-5 py-2.5 text-[13.5px] font-bold text-white hover:bg-duv-violet disabled:bg-duv-faint"
        >
          {busy === "rates" ? "Checking…" : "Get rates"}
        </button>
      </div>

      {suggestedWeightOz === null && (
        <p className="mt-2 text-[12px] leading-relaxed text-duv-plum">
          We couldn&rsquo;t work out the weight for {ref_} — a SKU on it isn&rsquo;t in the
          catalogue. Weigh the parcel and type it in; a guess becomes postage due at the
          customer&rsquo;s door.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-duv-red/10 px-3 py-2 text-[12.5px] leading-relaxed text-duv-red">
          {error}
        </p>
      )}

      {rates && rates.length > 0 && (
        <ul className="mt-4 divide-y divide-duv-line overflow-hidden rounded-xl border border-duv-line bg-white">
          {rates.map((r, i) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <span className="text-[13.5px] font-bold text-duv-plum">{r.carrier}</span>
              <span className="text-[13px] text-duv-muted">{r.service}</span>
              {r.estimatedDays !== null && (
                <span className="text-[12.5px] text-duv-faint">
                  {r.estimatedDays} day{r.estimatedDays === 1 ? "" : "s"}
                </span>
              )}
              {i === 0 && (
                <span className="rounded-full bg-duv-mint/30 px-2 py-0.5 text-[11px] font-bold text-duv-green">
                  Cheapest
                </span>
              )}
              <button
                type="button"
                onClick={() => buy(r)}
                disabled={busy !== null}
                className="ml-auto rounded-full bg-duv-pink px-5 py-2 text-[13px] font-bold text-white hover:bg-duv-coral disabled:bg-duv-faint"
              >
                {busy === r.id ? "Buying…" : `Buy ${money(r.amount)}`}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
