# DUV Collections

The online store for **DUV Prints and Gifts USA LLC** — DTF printing supplies, apparel,
gift articles, gold-plated jewelry and custom printing.

Live at **https://duvcollections.com**

## Stack

| Layer | What it is |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4, brand tokens in `src/app/globals.css` |
| Hosting | Cloudflare Workers via `@opennextjs/cloudflare` |
| Fonts | Plus Jakarta Sans, self-hosted in `src/fonts` — no third-party font requests |

Payments run through **Stripe Checkout** — see `docs/stripe-setup.md`.
The admin at `/admin` handles orders, products, shipping and sales — see
**`docs/admin-setup.md`** for the three things that have to be switched on
(Cloudflare Access, D1, Resend).

**Secrets never live in this repo.** `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`
go in the Cloudflare dashboard under Settings → Variables and Secrets, and in
`.dev.vars` locally (git-ignored — see `.dev.vars.example`).

## What's built

- Storefront: home, shop, 3 category pages with sub-filters, 53 product pages, search
- Cart with quantity editing and a free-shipping threshold nudge, persisted per browser
- Legal: Terms, Privacy, Payment, Shipping, Returns — written against how this
  business actually operates, not copied from a template
- About, Contact, FAQ, Custom Printing
- SEO: per-product titles, meta descriptions, keywords, canonical URLs,
  Product/Organization/FAQ structured data, sitemap.xml and robots.txt
- Accessibility: skip link, visible focus states, one h1 per page, labelled
  controls, reduced-motion support
- Admin at `/admin`, behind Cloudflare Access: order list and detail, mark-as-shipped
  with tracking email, product create/edit/archive with an audit trail, sales summary
  that separates revenue from tax held for Texas
- Customer order lookup at `/orders` — order reference **and** email, both required,
  plus signed one-click links in the confirmation and shipping emails so nobody has to type it
- Contact form that emails `info@` with honeypot, fill-time and rate-limit spam defences
- Scripted help widget that tracks orders and answers policy questions from `site.ts` —
  no language model, no per-message cost, and it hands off rather than inventing an answer
- Carrier auto-detection from the tracking number, so a mismatched carrier can't ship a dead link

## Layout structure

Storefront routes live in the `(shop)` route group, which owns the header, footer, cart provider
and help widget. `/admin` sits outside it with its own chrome. That split is why the dashboard
doesn't render a shop nav and a Cart button, and why admin pages don't load the catalogue.

`not-found.tsx` is deliberately self-contained — Next serialises the not-found tree into every
page's payload, so importing the real header there would ship the cart and the whole catalogue
with every response.

## Managing inventory

See `inventory/README.md`. Short version:

```bash
npm run inventory:export   # catalogue → inventory/products.csv
# edit stock / price / upc in Excel, save
npm run inventory:import   # CSV → catalogue
git add . && git commit -m "Update stock" && git push
```

## Product images

```bash
# 1. drop photos in inventory/photos/ — filename must contain the SKU
# 2.
npm run images:ingest
```

Each photo is resized to a 1400px square on white, converted to WebP, given a
600px thumbnail, and recorded in the manifest. Any product without a photo keeps
its illustration, so the site never breaks halfway through a photo shoot.

The fallback is a drawing on purpose. A stock photo of "a gold chain" standing in
for CH004 shows the customer something they will not receive — that is how a store
collects "item not as described" chargebacks.

## Business address

Your street address and phone are in `src/lib/site.ts` under `privateContact` and
are **never rendered**. See `docs/business-address.md` for the trade-offs and how
to publish a virtual business address instead when you want to.

## Business details

`src/lib/site.ts` is the single source of truth for address, phone, policy values
and contact routing. Every legal page, the footer and the structured data read from
it. **Anything marked `TODO_` must be filled in before you take a real order.**

## How deploys work

Cloudflare Workers Builds watches the `main` branch. **Push to `main` and the site
rebuilds and deploys itself** — there is nothing to run by hand.

- Build command: `npx @opennextjs/cloudflare build`
- Deploy command: `npx @opennextjs/cloudflare deploy`

## Running it locally

You only need this if you want to preview changes before pushing. Requires
[Node.js 20 or newer](https://nodejs.org).

```bash
npm install
npm run dev          # http://localhost:3000, hot reload
```

To preview exactly what Cloudflare will serve, including the Workers runtime:

```bash
npm run preview
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server with hot reload |
| `npm run build` | Next.js production build |
| `npm run cf-build` | Build the Cloudflare Worker bundle |
| `npm run preview` | Build and run it on the real Workers runtime locally |
| `npm run deploy` | Build and deploy straight to Cloudflare from your machine |
| `npm run lint` | Check code style |

## Secrets

**Never put an API key in this repo.** Not in a file, not in a commit, not even
temporarily. Anything secret goes in the Cloudflare dashboard under
**Workers & Pages → duvcollections → Settings → Variables and Secrets**, and locally in
`.dev.vars`, which `.gitignore` already excludes.

If a key ever does get committed, treat it as compromised: rotate it at the provider
immediately. Deleting the commit is not enough — it stays in the git history.

## Brand assets

Logos, icons and the colour palette live in `brand/` at the repo root. See
`brand/README.md` for which file to use where.
