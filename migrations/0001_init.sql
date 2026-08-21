-- DUV Collections catalogue.
-- Source of truth for products once seeded; the JSON file becomes the seed only.

CREATE TABLE IF NOT EXISTS products (
  sku             TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  price           REAL NOT NULL,
  category        TEXT NOT NULL,
  subcategory     TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  highlights      TEXT NOT NULL DEFAULT '[]',   -- JSON array
  good_for        TEXT NOT NULL DEFAULT '',
  specs           TEXT NOT NULL DEFAULT '{}',   -- JSON object
  art             TEXT NOT NULL DEFAULT 'generic',
  seo_title       TEXT NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT '',
  keywords        TEXT NOT NULL DEFAULT '[]',   -- JSON array
  stock           INTEGER,                      -- NULL = not counted
  low_stock_at    INTEGER NOT NULL DEFAULT 5,
  upc             TEXT,
  mpn             TEXT NOT NULL DEFAULT '',
  ship_weight_oz  REAL NOT NULL DEFAULT 4,
  wholesale       INTEGER NOT NULL DEFAULT 0,
  condition       TEXT NOT NULL DEFAULT 'new',
  archived        INTEGER NOT NULL DEFAULT 0,   -- hidden from the shop, kept for order history
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category, archived);
CREATE INDEX IF NOT EXISTS idx_products_archived ON products (archived);

-- Records every change, so a wrong price or stock edit can always be traced.
CREATE TABLE IF NOT EXISTS product_audit (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  sku       TEXT NOT NULL,
  action    TEXT NOT NULL,         -- created | updated | archived | restored
  changes   TEXT NOT NULL,         -- JSON of what changed
  actor     TEXT NOT NULL,
  at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_sku ON product_audit (sku, at DESC);
