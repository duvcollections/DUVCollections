"use client";

import { useState } from "react";

export function TestEmailButton({ to }: { to: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function send() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/test-email", { method: "POST" });
      const d = (await res.json()) as { ok?: boolean; error?: string; to?: string };
      setMsg(
        res.ok && d.ok
          ? { ok: true, text: `Sent to ${d.to}. If it doesn't arrive within a minute, check spam — that's a DNS problem, not a code one.` }
          : { ok: false, text: d.error ?? `Failed (${res.status}).` },
      );
    } catch {
      setMsg({ ok: false, text: "Couldn't reach the server." });
    }
    setBusy(false);
  }

  return (
    <div className="rounded-2xl border border-duv-line bg-white p-6">
      <h2 className="font-display text-lg font-extrabold tracking-tight">Check email is working</h2>
      <p className="mt-1.5 max-w-[62ch] text-[13.5px] leading-relaxed text-duv-muted">
        Sends the real shipping email to <strong className="text-duv-plum">{to}</strong> with
        made-up order details. Worth doing after any change to your Resend account or DNS —
        mail is the part of a shop that fails quietly.
      </p>
      <button
        type="button"
        onClick={send}
        disabled={busy}
        className="mt-4 rounded-full border-2 border-duv-plum px-6 py-2.5 text-[14px] font-bold text-duv-plum transition-colors hover:border-duv-violet hover:text-duv-violet disabled:border-duv-faint disabled:text-duv-faint"
      >
        {busy ? "Sending…" : "Send test email"}
      </button>
      {msg && (
        <p
          role="status"
          className={`mt-4 rounded-xl px-4 py-3 text-[13px] leading-relaxed font-semibold ${
            msg.ok ? "bg-duv-mint/20 text-duv-green" : "bg-duv-red/10 text-duv-red"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
