"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Defined at module scope, not inside the component.
 *
 * A component defined inside a render is a *new type* on every keystroke, so
 * React unmounts and remounts it — and the input loses focus mid-word. This
 * exact bug bit the product form; it is not repeated here.
 */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-bold text-duv-plum">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-duv-faint-ink">{hint}</span>}
    </label>
  );
}

const input =
  "mt-1.5 w-full rounded-xl border border-duv-line bg-white px-3.5 py-2.5 text-[14px] " +
  "focus:border-duv-violet focus:outline-none focus:ring-2 focus:ring-duv-violet/30";

export function DiscountForm() {
  const router = useRouter();
  const [kind, setKind] = useState<"percent" | "amount">("percent");
  const [code, setCode] = useState("");
  const [value, setValue] = useState("");
  const [maxRedemptions, setMax] = useState("");
  const [expiresOn, setExpires] = useState("");
  const [minimumOrder, setMin] = useState("");
  const [oncePerCustomer, setOnce] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          kind,
          value,
          maxRedemptions: maxRedemptions || null,
          expiresOn: expiresOn || null,
          minimumOrder: minimumOrder || null,
          oncePerCustomer,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { code?: string; error?: string };
      if (!res.ok) {
        setMsg({ ok: false, text: data.error ?? `Failed (${res.status}).` });
      } else {
        setMsg({ ok: true, text: `${data.code} is live. Customers can enter it at checkout.` });
        setCode("");
        setValue("");
        setMax("");
        setExpires("");
        setMin("");
        setOnce(false);
        router.refresh();
      }
    } catch {
      setMsg({ ok: false, text: "Couldn't reach the server." });
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-duv-line bg-white p-6">
      <h2 className="font-display text-lg font-extrabold">New discount code</h2>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Code" hint="Letters, numbers, - and _. Case doesn't matter at checkout.">
          <input
            className={input}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SPRING20"
            required
          />
        </Field>

        <Field label="Type">
          <select
            className={input}
            value={kind}
            onChange={(e) => setKind(e.target.value as "percent" | "amount")}
          >
            <option value="percent">Percentage off</option>
            <option value="amount">Fixed dollars off</option>
          </select>
        </Field>

        <Field label={kind === "percent" ? "Percent off" : "Dollars off"}>
          <input
            className={input}
            type="number"
            step={kind === "percent" ? "1" : "0.01"}
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={kind === "percent" ? "20" : "10.00"}
            required
          />
        </Field>

        <Field label="Minimum order" hint="Blank for no minimum.">
          <input
            className={input}
            type="number"
            step="0.01"
            min="0"
            value={minimumOrder}
            onChange={(e) => setMin(e.target.value)}
            placeholder="50.00"
          />
        </Field>

        <Field label="Total uses" hint="Blank for unlimited.">
          <input
            className={input}
            type="number"
            min="1"
            value={maxRedemptions}
            onChange={(e) => setMax(e.target.value)}
            placeholder="100"
          />
        </Field>

        <Field label="Expires on" hint="Blank for no expiry.">
          <input
            className={input}
            type="date"
            value={expiresOn}
            onChange={(e) => setExpires(e.target.value)}
          />
        </Field>
      </div>

      <label className="mt-4 flex items-center gap-2.5">
        <input
          type="checkbox"
          checked={oncePerCustomer}
          onChange={(e) => setOnce(e.target.checked)}
          className="h-4 w-4 rounded border-duv-line"
        />
        <span className="text-[13.5px] text-duv-muted">
          New customers only (no previous successful order)
        </span>
      </label>

      {msg && (
        <p
          role="status"
          className={`mt-4 rounded-xl px-4 py-3 text-[13.5px] font-semibold ${
            msg.ok ? "bg-duv-mint/25 text-duv-green-ink" : "bg-duv-coral/15 text-duv-coral"
          }`}
        >
          {msg.text}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-5 rounded-full bg-duv-pink-deep px-7 py-3 text-[14px] font-bold text-white hover:bg-duv-coral-deep disabled:opacity-50"
      >
        {busy ? "Creating…" : "Create code"}
      </button>
    </form>
  );
}
