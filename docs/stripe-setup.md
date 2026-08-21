# Switching on payments

Two secrets, one webhook, one test purchase. About fifteen minutes.

**You enter the keys yourself. Never paste a secret key into a chat, an email, or
a file in this repo — including to me.** Anyone who has your secret key can charge
cards and issue refunds on your account.

---

## 1. Get your test keys

Stripe Dashboard → toggle **Test mode** on (top right) → **Developers → API keys**.

You want the **Secret key**, which starts `sk_test_`. Click *Reveal*.

You do **not** need the publishable key. This site redirects to Stripe's own hosted
checkout page rather than embedding a card form, so no Stripe code runs in the
customer's browser at all. Fewer moving parts, and the simplest possible PCI scope.

## 2. Add it to Cloudflare

**Cloudflare → Compute (Workers) → duvcollections → Settings → Variables and Secrets → Add**

| Name | Value | Type |
|---|---|---|
| `STRIPE_SECRET_KEY` | your `sk_test_...` key | **Secret** (not Text) |

Choose **Secret**, not Text. Secrets are encrypted and can't be read back out of
the dashboard afterwards.

## 3. Create the webhook

The webhook is how your site learns a payment actually succeeded. Without it,
a customer could close the browser at the wrong moment and you'd never know they paid.

Stripe Dashboard (still in Test mode) → **Developers → Webhooks → Add endpoint**

- **Endpoint URL:** `https://duvcollections.com/api/stripe/webhook`
- **Events to send** — select these five:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.async_payment_failed`
  - `charge.refunded`
  - `charge.dispute.created`

Add the endpoint, then click into it and **Reveal** the *Signing secret* — it starts
`whsec_`. Add that to Cloudflare the same way:

| Name | Value | Type |
|---|---|---|
| `STRIPE_WEBHOOK_SECRET` | your `whsec_...` secret | **Secret** |

Then **redeploy** so the Worker picks up the new secrets: Deployments → Retry, or
just push any commit.

## 4. Turn on Stripe Tax

Stripe Dashboard → **Tax → Settings**

- Set your **origin address** to your Texas business address
- Add a **registration** for **Texas**
- Set the default tax category to *General - Tangible Goods*

Checkout requests `automatic_tax`, so without this step Stripe will reject the
session. Tax Basic costs 0.5% per transaction where you're registered.

## 5. Make a test purchase

Go to duvcollections.com, add something to the cart, and check out with:

| Field | Value |
|---|---|
| Card | `4242 4242 4242 4242` |
| Expiry | any future date |
| CVC | any 3 digits |
| ZIP | any valid US ZIP |

No real money moves. Then confirm all four:

- [ ] Stripe's hosted page showed **shipping** ($5.99, or free over $75)
- [ ] It showed **sales tax** once you entered a Texas address
- [ ] You landed on the **Order confirmed** page and the cart emptied
- [ ] Stripe Dashboard → **Developers → Webhooks** shows a **200** for your endpoint

That last one is the important one. A non-200 means the site never learned about
the payment.

Useful failure cards, worth trying at least the first:

| Card | What it does |
|---|---|
| `4000 0000 0000 0002` | Declined — you should stay on Stripe with an error, no order created |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0025 0000 3155` | Requires 3D Secure authentication |

## 6. Going live

Only after every box above is ticked:

1. Finish Stripe account activation — business details, EIN, bank account. Takes
   1–3 business days on Stripe's side.
2. Switch the dashboard **out of Test mode**.
3. Create the webhook endpoint **again** in live mode — the test one does not carry
   over. Same URL, same five events. It has a *different* signing secret.
4. In Cloudflare, replace both secrets with the live values (`sk_live_...` and the
   new `whsec_...`).
5. Redeploy.
6. **Buy something yourself with a real card**, then refund it from the Stripe
   dashboard. It costs you the processing fee on a small order and it is the only
   way to be certain the live path works end to end.

---

## How the money path actually works

```
Browser                  Your Worker                 Stripe
   │                          │                         │
   │  POST /api/checkout      │                         │
   │  { sku, qty } only ─────►│                         │
   │                          │ prices looked up from    │
   │                          │ the catalogue, never     │
   │                          │ from the browser         │
   │                          │ create session ────────►│
   │◄──── redirect URL ───────│                         │
   │                                                    │
   │  card details go straight to Stripe ──────────────►│
   │                                                    │
   │                          │◄─── signed webhook ─────│
   │                          │ signature verified      │
   │                          │ before anything is      │
   │                          │ trusted                 │
```

Two things worth understanding, because they're what stops the common attacks:

**The browser never sends a price.** It sends SKUs and quantities. Every amount is
looked up server-side from the catalogue. A customer editing the page to claim a
$21 chain costs $0.01 changes nothing — the field simply isn't read.

**Every webhook is signature-checked.** Stripe signs each event with your signing
secret. Anyone who discovers the endpoint URL and POSTs a fake "payment succeeded"
gets a 400. Skipping this check is how stores end up shipping goods for free.
