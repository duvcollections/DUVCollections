# Why your address and phone aren't on the site — and what to do about it

Your street address and phone number are stored in `src/lib/site.ts` under
`privateContact`, and **nothing in the site renders them**. Grep confirms it:

```bash
grep -rn "privateContact\|972-400\|Golden Sands" src/app src/components
# → no matches
```

They're kept in the file because Stripe verification, Texas sales tax
registration and shipping labels all need them, and one source of truth beats
having them scattered across three places. But they never reach a page.

This is a completely reasonable choice — `300 Golden Sands Ln` is a residential
address, and publishing a home address next to a public storefront invites
problems you don't want. Plenty of small businesses make the same call.

## What it costs you, honestly

You should know the trade-offs rather than discover them later:

**Trust.** Displaying a real address and phone number is one of the strongest
signals a shopper uses to decide whether an unfamiliar store is real. Its absence
doesn't disqualify you, but it does mean the rest of the site has to work harder
— which is why the storefront leans on your eBay record, named staff emails,
stated response times and specific policies instead.

**Card network expectations.** Visa and Mastercard rules expect merchants to make
customer service contact details available. Your published email addresses,
stated hours and response time satisfy the practical requirement. A displayed
phone number would satisfy it more completely.

**Some sales channels require it.** Google Shopping, Amazon and Walmart each ask
for verifiable business contact details before they'll list you. If you expand
to those, you'll need an address you're willing to publish.

**Chargebacks.** In a dispute, "the merchant provided no contact information"
is a point the cardholder's bank weighs. Keeping every conversation in email
gives you a written record, which helps — but it isn't the same thing.

## The fix, when you want it

Don't publish your home address — get a business one. Any of these gives you an
address you're happy to display, usually for $10–30/month:

- **A virtual business address** (Anytime Mailbox, PostScan Mail, iPostal1, and
  similar). Mail is scanned and forwarded. This is what most home-based
  ecommerce businesses use, and it's the option I'd pick.
- **A USPS PO Box.** Cheapest, but some platforms reject PO boxes as a business
  address.
- **Your registered agent's address**, if your Texas agent offers mail service.

For the phone, a Google Voice number costs nothing and forwards to your mobile
without exposing it.

## Turning it back on

When you have an address you're willing to publish, the change is small. Move
the values from `privateContact` into a public `address` field, then restore the
address block in three files: `src/components/Footer.tsx`,
`src/app/contact/page.tsx` and `src/components/PolicyLayout.tsx`. Ask me and I'll
do it in one edit — including adding it to the Organization structured data,
which is what lets Google show your business details in search results.
