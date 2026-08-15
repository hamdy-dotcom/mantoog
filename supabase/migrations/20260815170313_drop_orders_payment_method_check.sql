-- Retires `orders_payment_method_check`, a COD-era whitelist that rejects every
-- gateway id. It came with the dashboard-created base table, so it is not in
-- this directory (see README.md).
--
-- Dropped rather than widened: the gateway list lives in
-- src/lib/payment-gateways/registry.ts and grows by adding a folder, and
-- /api/orders/create already rejects any method that is not 'cod' or a
-- registered, store-enabled, currency-compatible gateway.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
