-- Merchant payment flag: hide "Powered by Mantoog" on customer storefront once true.
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS has_paid boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN stores.has_paid IS 'Set true on first merchant payment (credit top-up, plan, etc.). Hides platform footer on public store pages.';

-- Backfill merchants who already have a paid order_credits row.
UPDATE stores s
SET has_paid = true
WHERE has_paid = false
  AND EXISTS (
    SELECT 1
    FROM order_credits oc
    WHERE oc.merchant_id = s.merchant_id
      AND COALESCE(oc.price_paid, 0) > 0
  );
