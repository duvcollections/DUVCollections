-- Cost price and product images.
--
-- Two additions that unlock quite a lot:
--
--   cost_price  what we pay a supplier, so the dashboard can report PROFIT
--               rather than only revenue. Nullable on purpose — an invented
--               cost is worse than an absent one, because a wrong profit
--               figure gets believed. Reports say "cost not set" until filled.
--
--   images      photo URLs per SKU, so the shop can finally show what it sells.
--               Held as JSON rather than a child table: a product has a handful
--               of images in a fixed order, they are always read together with
--               the product, and a join for that is machinery without a payoff.

ALTER TABLE products ADD COLUMN cost_price REAL;

-- JSON array of image URLs, best first. Empty array = no photography yet, and
-- the storefront falls back to its illustration.
ALTER TABLE products ADD COLUMN images TEXT NOT NULL DEFAULT '[]';
