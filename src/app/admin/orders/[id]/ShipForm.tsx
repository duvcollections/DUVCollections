"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { detectCarrier, looksLikeTracking } from "@/lib/carrier";

const CARRIERS = ["USPS", "UPS", "FedEx", "DHL", "Other"];

export function ShipForm({
  id,
  carrier: initialCarrier,
  tracking: initialTracking,
  customerEmail,
}: {
  id: string;
  carrier: string | null;
  tracking: string | null;
  customerEmail: string | null;
}) {
  const router = useRouter();
  const [carrier, setCarrier] = useState(initialCarrier ?? "USPS");
  const [tracking, setTracking] = useState(initialTracking ?? "");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const detected = detectCarrier(tracking);
  // Only worth flagging once the number is long enough to be a real one —
  // otherwise it shouts at you while you are still typing.
  const mismatch = detected !== null && detected !== carrier && looksLikeTracking(tracking);
  const unrecognised = tracking.trim() !== "" && looksLikeTracking(tracking) && detected === null;

  /**
   * Fill the carrier in from the number itself.
   *
   * A tracking number pasted against the wrong carrier produces a tracking link
   * that goes nowhere — and the person who finds that out is the customer, a day
   * later, by email. The format identifies the carrier, so the form does it.
   */
  function onTrackingChange(value: string) {
    setTracking(value);
    const guess = detectCarrier(value);
    // Only auto-switch when nothing has been chosen by hand yet. Overriding a
    // deliberate choice would be worse than the problem it solves.
    if (guess && !initialCarrier && carrier === "USPS" && guess !== "USPS") setCarrier(guess);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tracking.trim()) {
      setMsg({ ok: false, text: "Enter a tracking number first." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/ship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, carrier, tracking: tracking.trim(), notify }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; emailed?: boolean; emailError?: string };
      if (!res.ok || !data.ok) {
        setMsg({ ok: false, text: data.error ?? `Failed (${res.status}).` });
      } else {
        setMsg({
          ok: true,
          text: data.emailed
            ? "Saved and the customer has been emailed."
            : `Saved. ${data.emailError ? `Email not sent: ${data.emailError}` : "No email sent."}`,
        });
        router.refresh();
      }
    } catch {
      setMsg({ ok: false, text: "Couldn't reach the server. Try again." });
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-duv-line bg-white p-6">
      <h2 className="font-display text-lg font-extrabold tracking-tight">
        {initialTracking ? "Update tracking" : "Mark as shipped"}
      </h2>

      <div className="mt-5 grid gap-4 sm:grid-cols-[140px_1fr]">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-bold uppercase tracking-wide text-duv-faint">Carrier</span>
          <select
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            className="w-full rounded-xl border border-duv-line bg-white px-3.5 py-2.5 text-[14px] focus:border-duv-violet focus:outline-none"
          >
            {CARRIERS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-bold uppercase tracking-wide text-duv-faint">Tracking number</span>
          <input
            value={tracking}
            onChange={(e) => onTrackingChange(e.target.value)}
            placeholder="9400 1000 0000 0000 0000 00"
            className="w-full rounded-xl border border-duv-line bg-white px-3.5 py-2.5 font-mono text-[14px] focus:border-duv-violet focus:outline-none"
          />
        </label>
      </div>

      {mismatch && (
        <p className="mt-3 rounded-xl bg-duv-amber/15 px-4 py-3 text-[13px] leading-relaxed text-duv-plum">
          That number is in <strong>{detected}</strong> format, but the carrier says{" "}
          <strong>{carrier}</strong>. If that&rsquo;s wrong the tracking link will go nowhere.{" "}
          <button
            type="button"
            onClick={() => setCarrier(detected)}
            className="font-bold text-duv-violet underline underline-offset-2"
          >
            Switch to {detected}
          </button>
        </p>
      )}

      {unrecognised && (
        <p className="mt-3 text-[12.5px] leading-relaxed text-duv-faint">
          That number doesn&rsquo;t match a format we recognise. It may still be fine — check the
          carrier above is right before you save.
        </p>
      )}

      <label className="mt-4 flex items-start gap-2.5 text-[13.5px]">
        <input
          type="checkbox"
          checked={notify}
          onChange={(e) => setNotify(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#FF2E93]"
        />
        <span className="text-duv-muted">
          Email the tracking number to{" "}
          <strong className="text-duv-plum">{customerEmail ?? "the customer"}</strong>
        </span>
      </label>

      {msg && (
        <p
          role="status"
          className={`mt-4 rounded-xl px-4 py-3 text-[13px] font-semibold ${
            msg.ok ? "bg-duv-mint/20 text-duv-green" : "bg-duv-red/10 text-duv-red"
          }`}
        >
          {msg.text}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-5 rounded-full bg-duv-plum px-7 py-3.5 text-[14.5px] font-bold text-white transition-colors hover:bg-duv-violet disabled:bg-duv-faint"
      >
        {busy ? "Saving…" : initialTracking ? "Update" : "Mark shipped"}
      </button>
    </form>
  );
}
