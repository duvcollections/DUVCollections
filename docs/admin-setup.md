# Turning the admin on

**Steps 1 and 2 are already done** — configured on 21 August 2026. This file is
now the record of what was set up and where to change it, plus the one step that
is still open.

| # | Piece | Status |
|---|---|---|
| 1 | **Cloudflare Access** — the login on `/admin` | ✅ Done |
| 2 | **D1 database** — add / edit / archive products | ✅ Done |
| 3 | **Resend** — the "your order shipped" email | ⚠️ Key is set; verify the domain |

Orders and sales need **none** of these beyond step 1 — they read from Stripe,
which already has every order. There is no second orders database to keep in sync,
and nothing to back up.

---

## 1. Cloudflare Access — done

**Application:** `DUV Admin` (Zero Trust → Access controls → Applications)

| Setting | Value |
|---|---|
| Type | Self-hosted |
| Destination 1 | `duvcollections.com/admin` |
| Destination 2 | `duvcollections.com/api/admin` |
| Session duration | 24 hours |
| Policy | `DUV Admins` — Allow, Include → Emails |
| Allowed emails | tony@, sales@, info@duvcollections.com |

Both destinations matter. The pages and the endpoints they post to are different
paths; protecting only `admin` would leave the endpoints exposed.

**Worker secrets** (Compute → duvcollections → Settings → Variables and Secrets,
runtime table, all type **Secret**):

| Name | Value |
|---|---|
| `CF_ACCESS_TEAM_DOMAIN` | `withered-mode-da25.cloudflareaccess.com` |
| `CF_ACCESS_AUD` | `20e26ef31183b69439bbd8247a3eff42b860edb26620bb885fa4c7580826a215` |
| `ADMIN_EMAILS` | `tony@duvcollections.com,sales@duvcollections.com,info@duvcollections.com` |

`ADMIN_EMAILS` is a second gate on purpose. Access policies get widened by accident
— someone adds a group, or an "everyone at this domain" rule. This list does not.
A valid Access token for an address that is not on it still gets refused.

**The workers.dev back door is closed.** Cloudflare gives every Worker a
`*.workers.dev` URL, and **Access does not protect it** — Access protects the
hostname, and that is a different hostname. Both
`duvcollections.tony-4b6.workers.dev` and the `*-duvcollections.tony-4b6.workers.dev`
preview wildcard are now **disabled** under Domains. The custom domains
(duvcollections.com and www) are untouched.

If you ever re-enable one for testing, remember it bypasses the login.

### To add or remove an admin later

Change it in **two** places or it won't take effect:

1. Zero Trust → Access → Applications → DUV Admin → Policies → `DUV Admins` → Emails
2. Compute → duvcollections → Settings → Variables and Secrets → `ADMIN_EMAILS`

The secret is the one that actually decides. The policy just controls who gets as
far as the login screen.

---

## 2. D1 — done

| Setting | Value |
|---|---|
| Database name | `duvcollections` |
| Database id | `3707b26b-20c6-42d2-a45a-2314b081a875` |
| Tables | `products`, `product_audit` |
| Binding | `DB` (in `wrangler.jsonc`) |

The id is already in `wrangler.jsonc` and both tables are created. The id is not a
secret — it is just an identifier, which is why it lives in the config file rather
than the secrets table.

**One thing left to do here:** once the site deploys, go to `/admin/products` and
press **Import catalogue**. That copies the products from `src/data/products.json`
into D1 once. Until you do, the shop still serves from the JSON file and the product
screens stay read-only. After you do, **D1 is the source of truth** and editing the
JSON file no longer changes anything.

### What the product screens do

- **Edit** price, stock, description, highlights, specs, UPC, ship weight, category.
  Saving takes effect on the shop immediately.
- **Archive** hides a product from the shop but keeps it in the database, so old
  orders still show what was bought. There is no delete button, on purpose — a
  deleted product turns every past order line into a blank.
- **Every change is logged** to `product_audit` with the email that made it. When a
  price looks wrong three weeks later, you can see who changed it and when.

To run future migrations without the CLI: D1 → duvcollections → **Console**, and
paste one statement at a time.

---

## 3. Resend — shipping emails (key set, domain needs checking)

`RESEND_API_KEY` is already in the Worker secrets. What I could not check from the
Cloudflare side is whether **duvcollections.com is verified in Resend** — without
that, Resend refuses to send from `sales@duvcollections.com` and the shipping email
silently fails.

Open resend.com → **Domains**. If duvcollections.com shows **Verified**, you're done
and nothing below is needed. If it doesn't, work through this:

1. Sign in at **resend.com** as `tony@duvcollections.com`
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
