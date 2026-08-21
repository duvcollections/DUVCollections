-- Records which orders have already had their stock taken off.
--
-- Stripe retries a webhook until it gets a 2xx, and it can deliver the same
-- event more than once even after success. Without a record of what has already
-- been counted, a retry silently sells the same item twice — and the first you
-- would know is a customer being told their order is out of stock.
--
-- The session id is the primary key, so a second attempt is a no-op by
-- construction rather than by remembering to check.
CREATE TABLE IF NOT EXISTS stock_applied (
  session_id  TEXT PRIMARY KEY,
  applied_at  TEXT NOT NULL DEFAULT (datetime('now')),
  detail      TEXT NOT NULL DEFAULT ''    -- JSON: which SKUs moved, and by how much
);

-- One row per low-stock warning sent, so crossing the threshold emails you once
-- rather than on every order that follows while it stays low.
CREATE TABLE IF NOT EXISTS low_stock_notified (
  sku         TEXT PRIMARY KEY,
  notified_at TEXT NOT NULL DEFAULT (datetime('now')),
  at_level    INTEGER NOT NULL
);

-- One row per abandoned-cart reminder sent.
--
-- Stripe can deliver `checkout.session.expired` more than once, and a customer
-- who abandons three carts in a week should not get three near-identical
-- emails. The session id as primary key makes a repeat delivery a no-op by
-- construction, exactly like stock_applied.
CREATE TABLE IF NOT EXISTS cart_reminded (
  session_id  TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  reminded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
