# Turning the admin on

The admin exists at `/admin` in the code you already have. It stays locked until
three things are configured. Do them in this order — each one is independent, and
the site keeps serving customers the whole time.

| # | Piece | What it gives you | Cost |
|---|---|---|---|
| 1 | **Cloudflare Access** | The login on `/admin`. Nothing works without it. | Free up to 50 users |
| 2 | **D1 database** | Add / edit / archive products from the browser | Free tier is far more than this store needs |
| 3 | **Resend** | The "your order shipped" email with tracking | Free up to 3,000 emails/month |

Orders and sales need **none** of these beyond step 1 — they read from Stripe,
which already has every order. There is no second orders database to keep in sync,
and nothing to back up.

---

## 1. Cloudflare Access — the login (do this first)

Without this, `/admin` shows a "Not signed in" notice and refuses to load anything.
That is the safe default, but it also means the admin is useless until you finish
this step.

**a. Create the application**

1. Cloudflare dashboard → **Zero Trust** → **Access** → **Applications** → **Add an application** → **Self-hosted**
2. Application name: `DUV Admin`
3. Session duration: `24 hours`
4. Public hostname: domain `duvcollections.com`, path `admin`
5. **Add another** public hostname on the same application: domain `duvcollections.com`, path `api/admin`
   — this is the one people forget. The pages and the endpoints they post to are
   different paths; protecting only `admin` leaves the endpoints exposed.
6. Save.

**b. Add the policy**

1. On the application → **Policies** → **Add a policy**
2. Name: `Admins`, Action: `Allow`
3. Include → **Emails** → add `tony@duvcollections.com` (and any other address that
   should get in)
4. Save.

**c. Collect the two values the code needs**

- **Team domain** — Zero Trust → **Settings** → **Custom Pages** (or the URL you
  log in at). It looks like `yourteam.cloudflareaccess.com`. No `https://`.
- **Application Audience (AUD) tag** — on the application's **Overview** tab.
  A long hex string.

**d. Set the secrets**

Cloudflare dashboard → **Compute (Workers)** → `duvcollections` → **Settings** →
**Variables and Secrets**. Make sure you are in the **runtime** table, not the
Build one, and set each **Type: Secret**:

| Name | Value |
|---|---|
| `CF_ACCESS_TEAM_DOMAIN` | `yourteam.cloudflareaccess.com` |
| `CF_ACCESS_AUD` | the AUD tag |
| `ADMIN_EMAILS` | `tony@duvcollections.com` (comma-separated for more) |

`ADMIN_EMAILS` is a second gate on purpose. Access policies get widened by accident
— someone adds a group, or an "everyone at this domain" rule. This list does not.
A valid Access token for an address that is not on it still gets refused.

**e. Close the back door**

Cloudflare gives every Worker a `duvcollections.<something>.workers.dev` URL.
**Access does not protect it** — it protects the hostname, and that is a different
hostname. Anyone who finds it walks straight past the login.

Compute (Workers) → `duvcollections` → **Settings** → **Domains & Routes** →
find the `workers.dev` route → **Disable**.

The code verifies the Access JWT signature rather than trusting the header, so even
if that URL stayed open the admin would still refuse. Disable it anyway — defence
in depth is cheap here.

**f. Check it**

Open `https://duvcollections.com/admin` in a private window. You should get a
Cloudflare login, then the dashboard with your email in the top right. If you get
"Not signed in", the Access application isn't covering the path — recheck step a.

---

## 2. D1 — the product database

Until this exists, the shop serves the catalogue from `src/data/products.json` and
the admin's product screens are read-only. Orders, shipping and sales all work fine
without it.

Run these on your own machine, in the project folder:

```bash
npx wrangler login
npx wrangler d1 create duvcollections
```

The output ends with a block containing `database_id = "..."`. Copy that id into
`wrangler.jsonc`, replacing `REPLACE_WITH_YOUR_D1_DATABASE_ID`:

```jsonc
"d1_databases": [
  { "binding": "DB", "database_name": "duvcollections", "database_id": "paste-it-here" }
]
```

Then create the tables:

```bash
npx wrangler d1 execute duvcollections --remote --file=migrations/0001_init.sql
```

Commit and push `wrangler.jsonc`. Cloudflare rebuilds and the binding goes live.

**Seed it.** Go to `/admin/products` and press **Import catalogue**. That copies the
products from the JSON file into D1 once. From then on D1 is the source of truth and
the JSON file is only a fallback — editing the file no longer changes the shop.

The database id is not a secret; it is just an identifier, which is why it lives in
the config file rather than in the secrets table.

### What the product screens do

- **Edit** price, stock, description, highlights, specs, UPC, ship weight, category.
  Saving takes effect on the shop immediately.
- **Archive** hides a product from the shop but keeps it in the database, so old
  orders still show what was bought. There is no delete button, on purpose — a
  deleted product turns every past order line into a blank.
- **Every change is logged** to `product_audit` with the email that made it. When a
  price looks wrong three weeks later, you can see who changed it and when.

---

## 3. Resend — shipping emails

Skip this and everything still works; you just mark orders shipped without the
customer being emailed automatically (Stripe still sends the receipt at purchase).

1. Sign up at **resend.com** with `tony@duvcollections.com`
2. **Domains** → **Add domain** → `duvcollections.com`
3. Resend shows three DNS records. Add each one in Cloudflare → **DNS** →
   **Records** for duvcollections.com:
   - a `TXT` record for DKIM
   - an `MX` record for the bounce subdomain
   - a `TXT` record for SPF
   Set **Proxy status: DNS only** (grey cloud) on all of them. An orange cloud
   breaks mail records.
4. Wait for Resend to show **Verified** — usually minutes.
5. **API Keys** → **Create** → permission `Sending access` → copy the key.
6. Add it as a Cloudflare **Secret** named `RESEND_API_KEY`.

Mail sends from `sales@duvcollections.com`.

**Do not skip the DNS records.** Without SPF and DKIM, Gmail files your shipping
notifications as spam and your customers open support tickets asking where their
order is.

---

## Day-to-day: shipping an order

1. `/admin/orders` — orders needing attention are the ones marked **paid**
2. Click one. You get the items, the shipping address, and what the customer paid.
3. Buy the label wherever you buy labels today.
4. Paste the carrier and tracking number into the **Mark as shipped** box → Save.

That does three things at once: flags the order shipped in the list, emails the
customer a tracking link, and makes the tracking visible to them at
`/orders`. The tracking number is written to the Stripe session's metadata, so it
survives even if this site is rebuilt from scratch.

Customers look up their own orders at **duvcollections.com/orders** using the order
reference plus the email they ordered with. Both are required — the reference alone
would let anyone who guessed one read a stranger's name and address. The response is
identical for a wrong reference and a wrong email, so the form can't be used to
work out which references are real.

## Sales

`/admin/sales` separates two numbers that are easy to confuse:

- **Revenue** — what the business actually earned
- **Tax collected** — money you are holding for the State of Texas, not income

Reporting the second as the first is one of the more common ways a first-year
store gets its books wrong.

---

## If something goes wrong

| Symptom | Cause |
|---|---|
| `/admin` says "Not signed in" after logging in | Access application doesn't cover the path, or your email isn't in `ADMIN_EMAILS` |
| Saving a product says "no database" | `database_id` still says `REPLACE_WITH_...`, or the migration hasn't been run |
| Product edits don't show on the shop | Catalogue was never imported — press **Import catalogue** on `/admin/products` |
| Shipping email never arrives | `RESEND_API_KEY` missing, or the domain isn't verified in Resend |
| Order lookup says "couldn't check that right now" | `STRIPE_SECRET_KEY` isn't set in the **runtime** secrets table |
