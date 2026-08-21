"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const REASONS = [
  { id: "requested_by_customer", label: "Customer asked for it" },
  { id: "duplicate", label: "Duplicate order" },
  { id: "fraudulent", label: "Fraudulent" },
];

/**
 * Refunds, behind a confirm step.
 *
 * Money leaving the business gets one more click than money coming in. The
 * button says the exact amount, and a partial refund has to be typed rather
 * than nudged with a slider — a mis-drag here is a real loss.
 */
export function RefundForm({
  id,
  ref_,
  total,
  hasStock,
}: {
  id: string;
  ref_: string;
  total: number;
  hasStock: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [partial, setPartial] = useState(false);
  const [amount, setAmount] = useState(total.toFixed(2));
  const [reason, setReason] = useState(REASONS[0].id);
  const [note, setNote] = useState("");
  const [restock, setRestock] = useState(hasStock);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const value = partial ? Number(amount) : total;
  const valid = Number.isFinite(value) && value > 0 && value <= total;

  async function submit() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          ...(partial ? { amount: value } : {}),
          reason,
          restock,
          note: note.trim() || undefined,
        }),
      });
      const d = (await res.json()) as {
        ok?: boolean; error?: string; refunded?: number; remaining?: number;
        restocked?: string | null; emailed?: boolean; emailError?: string | null;
      };
      if (!res.ok || !d.ok) {
        setMsg({ ok: false, text: d.error ?? `Refund failed (${res.status}).` });
      } else {
        const bits = [`Refunded $${d.refunded?.toFixed(2)}.`];
        if ((d.remaining ?? 0) > 0) bits.push(`$${d.remaining?.toFixed(2)} still refundable.`);
        if (d.restocked) bits.push(`Stock: ${d.restocked}.`);
        bits.push(d.emailed ? "Customer emailed." : d.emailError ? `Email failed: ${d.emailError}` : "No email sent.");
        setMsg({ ok: true, text: bits.join(" ") });
        setOpen(false);
        setConfirming(false);
        router.refresh();
      }
    } catch {
      setMsg({ ok: false, text: "Couldn't reach the server. Check Stripe before retrying." });
    }
    setBusy(false);
  }

  if (!open) {
    return (
      <div>
        {msg && (
          <p
            role="status"
            className={`mb-3 rounded-xl px-4 py-3 text-[13px] font-semibold ${
              msg.ok ? "bg-duv-mint/20 text-duv-green" : "bg-duv-red/10 text-duv-red"
            }`}
          >
            {msg.text}
          </p>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[13.5px] font-bold text-duv-red underline decoration-2 underline-offset-4 hover:opacity-75"
        >
          Refund this order
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-duv-red/40 bg-duv-red/[0.04] p-5">
      <h3 className="font-display text-[15px] font-extrabold tracking-tight">Refund {ref_}</h3>

      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPartial(false)}
            className={`rounded-full border px-4 py-2 text-[13px] font-semibold ${
              !partial ? "border-duv-plum bg-duv-plum text-white" : "border-duv-line bg-white text-duv-plum"
            }`}
          >
            Full · ${total.toFixed(2)}
          </button>
          <button
            type="button"
            onClick={() => setPartial(true)}
            className={`rounded-full border px-4 py-2 text-[13px] font-semibold ${
              partial ? "border-duv-plum bg-duv-plum text-white" : "border-duv-line bg-white text-duv-plum"
            }`}
          >
            Part of it
          </button>
        </div>

        {partial && (
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wide text-duv-faint">
              Amount (max ${total.toFixed(2)})
            </span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              className="w-40 rounded-xl border border-duv-line bg-white px-3 py-2 font-mono text-[14px] focus:border-duv-violet focus:outline-none"
            />
          </label>
        )}

        <label className="block">
          <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wide text-duv-faint">Reason</span>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-xl border border-duv-line bg-white px-3 py-2 text-[14px] focus:border-duv-violet focus:outline-none"
          >
            {REASONS.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wide text-duv-faint">
            Note to the customer <span className="font-normal normal-case">(optional)</span>
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={400}
            className="w-full rounded-xl border border-duv-line bg-white px-3 py-2 text-[14px] focus:border-duv-violet focus:outline-none"
            placeholder="Goes in the refund email."
          />
        </label>

        {hasStock && (
          <label className="flex items-start gap-2.5 text-[13px]">
            <input
              type="checkbox"
              checked={restock}
              onChange={(e) => setRestock(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#FF2E93]"
            />
            <span className="text-duv-muted">
              Put the items back into stock
            </span>
          </label>
        )}
      </div>

      {msg && !msg.ok && (
        <p role="alert" className="mt-4 rounded-xl bg-duv-red/10 px-4 py-3 text-[13px] font-semibold text-duv-red">
          {msg.text}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {confirming ? (
          <>
            <span className="text-[13px] font-bold text-duv-red">
              This moves money. Sure?
            </span>
            <button
              type="button"
              onClick={submit}
              disabled={busy || !valid}
              className="rounded-full bg-duv-red px-6 py-2.5 text-[13.5px] font-bold text-white hover:opacity-90 disabled:bg-duv-faint"
            >
              {busy ? "Refunding…" : `Yes, refund $${valid ? value.toFixed(2) : "—"}`}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="text-[13px] font-semibold text-duv-muted underline underline-offset-4">
              Back
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={!valid}
              className="rounded-full border-2 border-duv-red px-6 py-2.5 text-[13.5px] font-bold text-duv-red hover:bg-duv-red/5 disabled:border-duv-faint disabled:text-duv-faint"
            >
              Refund ${valid ? value.toFixed(2) : "—"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-[13px] font-semibold text-duv-muted underline underline-offset-4">
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
