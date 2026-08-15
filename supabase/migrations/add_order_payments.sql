-- Online payment state on customer orders.
--
-- `orders` was COD-only: `payment_method` always held 'cod' and there was no
-- concept of money changing hands before delivery. These columns add the
-- gateway axis alongside it.
--
-- `status` (fulfilment: pending → shipped → delivered) and `payment_status`
-- (money) are deliberately SEPARATE axes. A paid order still starts unfulfilled,
-- and a failed payment is not a fulfilment state.
--
-- No CHECK constraints: `orders.status` has none today, and adding one to a
-- live table with existing rows is a deploy risk for no real gain. The allowed
-- values are enforced in app code, and mirror `WebhookResult['status']` in
-- src/lib/payment-gateways/types.ts so adapters pass their value straight
-- through with no translation layer.

-- NOTE: `payment_status` ALREADY EXISTS on this table — it predates online
-- payments and carries a database-level DEFAULT of 'pending', which nothing
-- ever wrote to or read from. Every historical COD order therefore reads
-- 'pending'. The statement below is a no-op on the live database and is kept
-- only so a fresh environment ends up with the same shape.
--
-- The consequence, which app code must respect: `payment_status` alone does NOT
-- identify an order awaiting payment. `payment_method <> 'cod'` is the test for
-- "an online payment was attempted"; the status qualifies it. Filtering on the
-- status by itself hides the merchant's entire order history.
--
-- New COD orders are written with NULL to make the distinction explicit going
-- forward, so the column holds one of:
--   NULL                  no online payment (COD, written since this change)
--  'pending'              an online attempt in flight, OR a legacy COD order
--  'paid'|'failed'|'cancelled'  a settled online attempt
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status       text;

-- Gateway's own session/payment id, captured when the checkout URL is created.
-- Kept for support and reconciliation; it is NOT the webhook lookup key —
-- that is `orders.id`, which we send as the provider's merchant reference so it
-- round-trips back to us (and exists before the session does, closing the race
-- where a webhook arrives before we could store this).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_checkout_id  text;

-- Final transaction reference from the settling webhook.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_txn_id       text;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at              timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_error        text;

-- Last provider payload, verbatim. For debugging and chargeback disputes —
-- never read by application logic, which reads the normalised columns above.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_raw          jsonb;

-- Claimed atomically the first time the browser fires Purchase pixels for this
-- order, so a refresh of the return URL cannot double-count a conversion.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS purchase_tracked_at  timestamptz;

-- Post-purchase upsell accepted AFTER an online payment was already captured:
-- the extra is collected in cash on delivery rather than re-charging the card.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_balance_due      numeric DEFAULT 0;

-- Sweeping abandoned payment attempts (customer redirected, never came back).
-- The `payment_method` clause is what makes this index small: without it the
-- predicate matches every legacy COD row, i.e. most of the table.
CREATE INDEX IF NOT EXISTS idx_orders_payment_pending
  ON orders(created_at)
  WHERE payment_status = 'pending' AND payment_method <> 'cod';

-- OPTIONAL, not required by any code above. Retires the legacy default so
-- 'pending' means exactly one thing, and backfills historical cash orders to
-- match. Every query in the app is written to work with or without this, so it
-- is a data-hygiene step to run deliberately — it rewrites every existing row.
--
--   ALTER TABLE orders ALTER COLUMN payment_status DROP DEFAULT;
--   UPDATE orders SET payment_status = NULL
--    WHERE payment_method = 'cod' AND payment_status = 'pending';
