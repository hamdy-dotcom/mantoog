-- Online payment state on customer orders.
--
-- `status` (fulfilment) and `payment_status` (money) are deliberately separate
-- axes: a paid order still starts unfulfilled. Allowed values are enforced in
-- app code, mirroring `WebhookResult['status']` in
-- src/lib/payment-gateways/types.ts.

-- `payment_status` already exists on the live table with a DEFAULT of 'pending'
-- that nothing ever wrote or read, so every legacy COD order reads 'pending'
-- and the test for "an online payment was attempted" is `payment_method <>
-- 'cod'`, not the status alone. New COD orders are written NULL. The statement
-- below is a no-op in production, kept so fresh environments match.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status       text;

-- Gateway's own session/payment id. NOT the webhook lookup key — that is
-- `orders.id`, sent as the provider's merchant reference so it round-trips back
-- even if the webhook beats this write.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_checkout_id  text;

-- Final transaction reference from the settling webhook.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_txn_id       text;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at              timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_error        text;

-- Last provider payload, verbatim. For disputes; never read by app logic.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_raw          jsonb;

-- Claimed atomically the first time the browser fires Purchase pixels, so a
-- refresh of the return URL cannot double-count a conversion.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS purchase_tracked_at  timestamptz;

-- Upsell accepted after an online payment was captured: collected in cash on
-- delivery rather than re-charging the card.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_balance_due      numeric DEFAULT 0;

-- Sweeping abandoned payment attempts. The `payment_method` clause is what
-- keeps the index small — without it the predicate matches every legacy COD row.
CREATE INDEX IF NOT EXISTS idx_orders_payment_pending
  ON orders(created_at)
  WHERE payment_status = 'pending' AND payment_method <> 'cod';

-- OPTIONAL data hygiene, not required by any code above: retires the legacy
-- default so 'pending' means one thing. Rewrites every existing row.
--
--   ALTER TABLE orders ALTER COLUMN payment_status DROP DEFAULT;
--   UPDATE orders SET payment_status = NULL
--    WHERE payment_method = 'cod' AND payment_status = 'pending';
