"use client";

import { useEffect, useRef, useState } from "react";
import { CONTACT_TOPICS } from "@/lib/contact-topics";
import { site } from "@/lib/site";

const field =
  "w-full rounded-2xl border border-duv-line bg-white px-4 py-3 text-[15px] text-duv-plum placeholder:text-duv-faint focus:border-duv-violet focus:outline-none";

export function ContactForm() {
  // Stamped once on mount. The endpoint compares it against arrival time —
  // a form "filled in" in under three seconds was filled in by a script.
  // Read in an effect rather than during render: the clock is impure, and a
  // render-time read would differ between the server pass and hydration.
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const [topic, setTopic] = useState<string>(CONTACT_TOPICS[0]);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          orderRef: data.get("orderRef"),
          message: data.get("message"),
          website: data.get("website"), // honeypot
          topic,
          startedAt: startedAt.current,
        }),
      });
      const d = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) setError(d.error ?? `Couldn't send (${res.status}).`);
      else setSent(true);
    } catch {
      setError("We couldn't reach the server. Check your connection, or email us directly.");
    }
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="rounded-3xl border-2 border-duv-green bg-duv-mint/20 p-7">
        <h2 className="font-display text-[21px] font-extrabold tracking-[-0.02em]">
          Message sent
        </h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-duv-plum/80">
          It landed in the inbox a person actually reads. We reply{" "}
          {site.contact.responseTime} — check your spam folder if you don&rsquo;t hear back,
          because that&rsquo;s where replies occasionally end up.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-5 text-[14px] font-bold text-duv-violet underline decoration-2 underline-offset-4 hover:text-duv-pink"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-duv-line bg-white p-7">
      <h2 className="font-display text-[21px] font-extrabold tracking-[-0.02em]">
        Send us a message
      </h2>
      <p className="mt-1.5 text-[14px] leading-relaxed text-duv-muted">
        Goes straight to {site.contact.support}. No account, no ticket number.
      </p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-bold text-duv-plum">
            What&rsquo;s this about?
          </span>
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className={field}
            name="topicSelect"
          >
            {CONTACT_TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-bold text-duv-plum">Your name</span>
            <input name="name" required maxLength={100} autoComplete="name" className={field} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-bold text-duv-plum">Email</span>
            <input
              name="email"
              type="email"
              required
              maxLength={200}
              autoComplete="email"
              placeholder="you@example.com"
              className={field}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-bold text-duv-plum">
            Order reference <span className="font-normal text-duv-faint">(optional)</span>
          </span>
          <input
            name="orderRef"
            maxLength={40}
            placeholder="A1B2C3D4E5F6"
            className={`${field} font-mono uppercase`}
          />
          <span className="mt-1.5 block text-[12.5px] text-duv-faint">
            Including it gets you a real answer in one reply instead of three.
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-bold text-duv-plum">Message</span>
          <textarea
            name="message"
            required
            rows={6}
            minLength={10}
            maxLength={4000}
            className={`${field} resize-y`}
            placeholder="For a damaged item, tell us what arrived and we'll ask for photos of the box and contents — that's what a carrier claim needs."
          />
        </label>

        {/* Honeypot. Hidden from people, tempting to bots. Not display:none —
            some bots skip those — and taken out of the tab order and the
            accessibility tree so it never reaches a real customer. */}
        <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-2xl bg-duv-red/8 px-5 py-4 text-[14px] leading-relaxed text-duv-red"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 rounded-full bg-duv-pink px-8 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-duv-coral disabled:bg-duv-faint"
      >
        {busy ? "Sending…" : "Send message"}
      </button>

      <p className="mt-4 text-[12.5px] leading-relaxed text-duv-faint">
        We use what you write here to answer you and nothing else. See our{" "}
        <a className="underline underline-offset-2" href="/policies/privacy">
          privacy policy
        </a>
        .
      </p>
    </form>
  );
}
