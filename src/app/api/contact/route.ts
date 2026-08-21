import { NextRequest, NextResponse } from "next/server";
import { sendContactEmail } from "@/lib/email";
import { CONTACT_TOPICS } from "@/lib/contact-topics";

/**
 * Contact form endpoint.
 *
 * A public form that sends email is a spam relay unless it is defended, and the
 * damage isn't the junk in your inbox — it's your sending domain's reputation.
 * Enough spam sent through here and Gmail starts filing your *shipping* emails
 * as junk too. Four cheap defences, none of which a real customer ever notices:
 *
 *  1. A honeypot field, hidden from people and irresistible to bots.
 *  2. A minimum fill time. Nobody reads a form and writes a message in under
 *     three seconds; scripts submit instantly.
 *  3. A per-IP rate limit.
 *  4. Hard length caps, so nobody pastes a novel into your inbox.
 *
 * Deliberately not a CAPTCHA: they punish real customers, especially on phones
 * and with screen readers, and the bots that matter solve them anyway.
 */

const MAX = { name: 100, email: 200, message: 4000, orderRef: 40 };
const MIN_SECONDS = 3;

/** Per-IP counter. In-memory, so it resets when the Worker recycles — which is
 *  fine: it's a speed bump against floods, not an access control. */
const hits = new Map<string, number[]>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip: string, nowMs: number): boolean {
  const recent = (hits.get(ip) ?? []).filter((t) => nowMs - t < WINDOW_MS);
  recent.push(nowMs);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // crude bound; never grows without limit
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(req: NextRequest) {
  const nowMs = Date.now();
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  let body: {
    name?: string; email?: string; topic?: string; orderRef?: string;
    message?: string; website?: string; startedAt?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // 1. Honeypot. A real browser never fills this — it isn't visible.
  //    Answer 200 so a bot can't tell it was caught and retune.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    console.log(`[contact] honeypot triggered from ${ip}`);
    return NextResponse.json({ ok: true });
  }

  // 2. Fill time.
  const started = Number(body.startedAt);
  if (Number.isFinite(started) && nowMs - started < MIN_SECONDS * 1000) {
    return NextResponse.json(
      { error: "That was quick — give it another moment and send again." },
      { status: 429 },
    );
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const message = String(body.message ?? "").trim();
  const orderRef = String(body.orderRef ?? "").trim();
  const topic = CONTACT_TOPICS.includes(body.topic as (typeof CONTACT_TOPICS)[number])
    ? (body.topic as string)
    : CONTACT_TOPICS[CONTACT_TOPICS.length - 1];

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Please fill in your name, email and message." },
      { status: 400 },
    );
  }
  // Not a full RFC 5322 check — just enough to catch a typo before it costs a reply.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ error: "That email address doesn't look right." }, { status: 400 });
  }
  if (message.length < 10) {
    return NextResponse.json(
      { error: "Tell us a little more — a one-word message is hard to answer." },
      { status: 400 },
    );
  }
  // 4. Length caps.
  if (
    name.length > MAX.name ||
    email.length > MAX.email ||
    message.length > MAX.message ||
    orderRef.length > MAX.orderRef
  ) {
    return NextResponse.json({ error: "That message is too long to send." }, { status: 400 });
  }
  // Header injection: a newline in the name would let someone add their own
  // headers to the outgoing mail. Strip rather than reject — usually a paste.
  const safeName = name.replace(/[\r\n]/g, " ");

  // 3. Rate limit — checked here, after validation, on purpose. Counting
  //    rejected attempts would lock out the customer who mistypes their email
  //    twice and then gets told to go away for fifteen minutes. The expensive
  //    thing is the send, so the send is what's counted.
  if (rateLimited(ip, nowMs)) {
    return NextResponse.json(
      { error: "That's a few messages in a short time. Email us directly and we'll pick it up." },
      { status: 429 },
    );
  }

  const sent = await sendContactEmail({
    name: safeName,
    from: email,
    topic,
    orderRef: orderRef || null,
    message,
  });

  if (!sent.ok) {
    console.error(`[contact] send failed: ${sent.error}`);
    return NextResponse.json(
      { error: "We couldn't send that just now. Please email us directly and we'll reply." },
      { status: 502 },
    );
  }

  console.log(`[contact] ${topic} from ${email}${orderRef ? ` (${orderRef})` : ""}`);
  return NextResponse.json({ ok: true });
}
