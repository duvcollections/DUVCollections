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

Payments (Stripe), database and login (Supabase), and transactional email (Resend) are
not wired up yet. They come with the storefront build.

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
