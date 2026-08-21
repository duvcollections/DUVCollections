"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ANSWERS, FALLBACK, OPENERS, ORDER_INTENT, route } from "./answers";
import type { CustomerOrderView } from "@/lib/orders-admin";
import { money, site } from "@/lib/site";

type Chip = { label: string; value: string };

type Message = {
  id: number;
  from: "bot" | "you";
  text: string;
  link?: { href: string; label: string };
  order?: CustomerOrderView;
  chips?: Chip[];
};

/** Where we are in the order-lookup conversation. */
type Step = "idle" | "ref" | "email";

const openerChips = (): Chip[] =>
  OPENERS.map((id) => {
    const a = ANSWERS.find((x) => x.id === id)!;
    return { label: a.chip, value: a.chip };
  });

let nextId = 1;

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [pendingRef, setPendingRef] = useState("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // The greeting is rendered, not stored. Pushing it into state on open meant a
  // setState inside an effect for a message that never changes — and it made the
  // "has the conversation started?" check depend on the greeting being there.
  const greeting: Message = {
    id: 0,
    from: "bot",
    text:
      `Hi — I can look up your order and answer the common questions. ` +
      `Anything I don't know goes to a person at ${site.contact.support}.`,
    chips: openerChips(),
  };

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open]);

  // Escape closes, and focus returns to the launcher rather than being dumped
  // at the top of the page.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const say = (m: Omit<Message, "id">) => setMessages((prev) => [...prev, { ...m, id: nextId++ }]);

  function reset() {
    setStep("idle");
    setPendingRef("");
  }

  async function lookUp(ref: string, email: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/order-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref, email }),
      });
      const d = (await res.json()) as {
        found?: boolean; order?: CustomerOrderView; message?: string; error?: string;
      };
      if (d.error) {
        say({ from: "bot", text: d.error, chips: openerChips() });
      } else if (d.found && d.order) {
        const o = d.order;
        say({
          from: "bot",
          text:
            o.status === "shipped"
              ? `Found it. ${o.ref} shipped${o.shippedAt ? "" : ""} via ${o.carrier}. Delivery normally takes ${site.policy.deliveryEstimate} from dispatch.`
              : `Found it. ${o.ref} is paid and being packed. Orders leave us within ${site.policy.handlingDays}, and you'll get tracking by email the moment the label is bought.`,
          order: o,
        });
      } else {
        say({
          from: "bot",
          text:
            (d.message ?? "I couldn't find that one.") +
            ` If you're sure both are right, email ${site.contact.support} from the address you ordered with and a person will find it.`,
          chips: openerChips(),
        });
      }
    } catch {
      say({
        from: "bot",
        text: `I couldn't reach the order system just now. Email ${site.contact.support} and we'll look it up by hand.`,
        chips: openerChips(),
      });
    }
    setBusy(false);
    reset();
  }

  function handle(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;
    say({ from: "you", text });
    setInput("");

    // Mid-conversation: the order lookup needs two answers in order.
    if (step === "ref") {
      const ref = text.replace(/[\s-]/g, "").toUpperCase();
      if (ref.length < 8) {
        say({
          from: "bot",
          text: "That looks short — the reference is 12 characters, shown on your confirmation page and in the email we sent. Try again?",
        });
        return;
      }
      setPendingRef(ref);
      setStep("email");
      say({
        from: "bot",
        text: "Thanks. And the email address you checked out with? I need both — otherwise anyone who guessed a reference could read someone else's order.",
      });
      return;
    }

    if (step === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text)) {
        say({ from: "bot", text: "That doesn't look like an email address. Try again?" });
        return;
      }
      say({ from: "bot", text: "Looking…" });
      void lookUp(pendingRef, text);
      return;
    }

    const answer = route(text);

    if (answer?.id === ORDER_INTENT) {
      setStep("ref");
      say({
        from: "bot",
        text: "Happy to. What's your order reference? It's the 12 characters on your confirmation page — something like A1B2C3D4E5F6.",
        link: { href: "/orders", label: "Or use the tracking page" },
      });
      return;
    }

    if (answer) {
      say({ from: "bot", text: answer.body(), link: answer.link, chips: openerChips() });
      return;
    }

    say({
      from: "bot",
      text: FALLBACK,
      link: { href: "/contact", label: "Send us a message" },
      chips: openerChips(),
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="duv-chat"
        className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full bg-duv-plum px-5 py-3.5 text-[14px] font-bold text-white shadow-lg transition-colors hover:bg-duv-violet"
      >
        <span aria-hidden="true">{open ? "✕" : "💬"}</span>
        <span>{open ? "Close" : "Help"}</span>
      </button>

      {open && (
        <div
          id="duv-chat"
          ref={panelRef}
          role="dialog"
          aria-label="Help and order tracking"
          className="fixed bottom-[76px] right-5 z-[60] flex max-h-[min(560px,calc(100dvh-110px))] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl border border-duv-line bg-white shadow-2xl"
        >
          <div className="border-b border-duv-line bg-duv-shell px-5 py-3.5">
            <p className="font-display text-[15px] font-extrabold tracking-tight">
              {site.name} help
            </p>
            <p className="text-[12px] text-duv-muted">
              Automated — a person answers anything I can&rsquo;t
            </p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {[greeting, ...messages].map((m) => (
              <div key={m.id}>
                <div
                  className={`max-w-[86%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
                    m.from === "you"
                      ? "ml-auto bg-duv-plum text-white"
                      : "bg-duv-shell text-duv-plum"
                  }`}
                >
                  {m.text}
                </div>

                {m.order && <OrderCard order={m.order} />}

                {m.link && (
                  <Link
                    href={m.link.href}
                    onClick={() => setOpen(false)}
                    className="mt-1.5 inline-block text-[13px] font-bold text-duv-violet underline decoration-2 underline-offset-4 hover:text-duv-pink"
                  >
                    {m.link.label} →
                  </Link>
                )}

                {m.chips && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {m.chips.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => handle(c.value)}
                        className="rounded-full border border-duv-line bg-white px-3 py-1.5 text-[12.5px] font-semibold text-duv-plum transition-colors hover:border-duv-violet hover:text-duv-violet"
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handle(input);
            }}
            className="flex gap-2 border-t border-duv-line px-4 py-3"
          >
            <label htmlFor="duv-chat-input" className="sr-only">
              Your message
            </label>
            <input
              id="duv-chat-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
              autoComplete="off"
              placeholder={
                step === "ref"
                  ? "Order reference"
                  : step === "email"
                    ? "Email you ordered with"
                    : "Ask about an order, shipping…"
              }
              className="min-w-0 flex-1 rounded-full border border-duv-line bg-white px-4 py-2.5 text-[14px] focus:border-duv-violet focus:outline-none disabled:bg-duv-shell"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="shrink-0 rounded-full bg-duv-pink px-5 py-2.5 text-[13.5px] font-bold text-white hover:bg-duv-coral disabled:bg-duv-faint"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function OrderCard({ order }: { order: CustomerOrderView }) {
  return (
    <div className="mt-2 rounded-2xl border border-duv-line bg-white p-4 text-[13.5px]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[13px] font-bold">{order.ref}</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-bold ${
            order.status === "shipped"
              ? "bg-duv-mint/25 text-duv-green"
              : "bg-duv-pink/12 text-duv-pink"
          }`}
        >
          {order.status === "shipped" ? "Shipped" : "Being packed"}
        </span>
      </div>

      <ul className="mt-2.5 space-y-1 text-duv-muted">
        {order.items.map((i, n) => (
          <li key={n} className="flex justify-between gap-3">
            <span className="truncate">{i.title}</span>
            <span className="shrink-0 font-mono">&times;{i.qty}</span>
          </li>
        ))}
      </ul>

      <p className="mt-2.5 flex justify-between border-t border-duv-line pt-2 font-bold">
        <span>Total paid</span>
        <span className="tabular-nums">{money(order.total)}</span>
      </p>

      {order.status === "shipped" && order.tracking && (
        <div className="mt-3 rounded-xl bg-tint-printing p-3">
          <p className="text-[11.5px] font-bold uppercase tracking-wide text-duv-plum/60">
            {order.carrier}
          </p>
          <p className="mt-0.5 break-all font-mono text-[13px] font-bold">{order.tracking}</p>
          {order.trackingUrl && (
            <a
              href={order.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block rounded-full bg-duv-plum px-4 py-2 text-[12.5px] font-bold text-white hover:bg-duv-violet"
            >
              Track your parcel
            </a>
          )}
        </div>
      )}
    </div>
  );
}
