# Inventory

The catalogue lives in `src/data/products.json`. You don't need to edit that file
by hand — use the spreadsheet round-trip instead.

## Updating stock, prices or barcodes

```bash
npm run inventory:export    # writes inventory/products.csv from the catalogue
# open inventory/products.csv in Excel or Google Sheets, edit, save as CSV
npm run inventory:import    # reads your edits back in
git add . && git commit -m "Update stock" && git push
```

The push triggers a rebuild and the site is live with the new numbers in a couple
of minutes.

**The importer only touches `stock`, `lowStockAt`, `price`, `upc` and
`shipWeightOz`.** Titles, descriptions and specs are deliberately left alone, so a
stray edit in a spreadsheet cell can't mangle your product copy.

## Columns you fill in

| Column | What to put |
|---|---|
| `stock` | Units on hand. Leave blank if you don't track it — the product shows as "In stock". |
| `lowStockAt` | Below this, the page shows "Only N left". Default 5. |
| `upc` | The real 12-digit UPC if you have one. See below. |
| `price` | US dollars. Changing it here changes it on the site. |
| `shipWeightOz` | Shipping weight in ounces, for packing and label estimates. |

## How stock displays

| `stock` value | Shown to customers |
|---|---|
| blank | **In stock** |
| above `lowStockAt` | **In stock** |
| 1 to `lowStockAt` | **Only N left** |
| `0` | **Out of stock** |

Leaving stock blank is fine to launch with, but a real count is what stops you
selling something you don't have. Nothing annoys a customer more than an order
that gets cancelled two days later.

## About UPCs — read this before filling that column

**Do not invent UPC numbers, and don't let any tool generate them for you.** A UPC
is a globally unique identifier issued by GS1. A made-up number will collide with
a real product somewhere in the world, and it will get your listings rejected or
suspended on Amazon, Walmart and Google Shopping.

Three legitimate ways to fill this column:

1. **You already have them.** If your eBay listings carry UPCs, export them:
   eBay Seller Hub → Listings → Download report. The export has a UPC column.
   Paste it in.
2. **The manufacturer assigned one.** Branded goods — the LOCS sunglasses, the
   HTVRONT vinyl — usually have a UPC on the packaging. Use that one; you don't
   need your own.
3. **Buy your own from GS1** at gs1us.org. Needed only for your own-brand goods,
   and only if you plan to list on Amazon, Walmart or Google Shopping.

**Leaving it blank is completely fine.** Your own store works perfectly without
UPCs. The importer validates the format and refuses anything that isn't 12 or 13
digits, because a wrong barcode is worse than no barcode.
