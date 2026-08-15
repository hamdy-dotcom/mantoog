-- Per-store payment gateway credentials (PayTabs / Tabby / Tamara).
--
-- Not on `stores`: the storefront does `stores.select('*')` client-side, which
-- would ship these keys to every visitor — same reasoning as `snapchat_capi`.
-- Secret values are additionally encrypted at rest by the app (see
-- src/lib/payment-gateways/crypto.ts).

CREATE TABLE IF NOT EXISTS store_payment_gateways (
  store_id      uuid        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  gateway       text        NOT NULL,                      -- 'paytabs' | 'tabby' | 'tamara'
  merchant_id   uuid        NOT NULL,
  enabled       boolean     NOT NULL DEFAULT false,

  -- Plaintext, returned to the browser as-is; `credentials` holds the
  -- encrypted secrets.
  public_config jsonb       NOT NULL DEFAULT '{}'::jsonb,
  credentials   jsonb       NOT NULL DEFAULT '{}'::jsonb,

  status        text        NOT NULL DEFAULT 'unverified'
                            CHECK (status IN ('unverified', 'verified', 'invalid')),

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (store_id, gateway)
);

CREATE INDEX IF NOT EXISTS idx_store_payment_gateways_merchant_id
  ON store_payment_gateways(merchant_id);

-- Only enabled rows are ever looked up at charge time.
CREATE INDEX IF NOT EXISTS idx_store_payment_gateways_enabled
  ON store_payment_gateways(store_id) WHERE enabled;

-- Intentionally no policies: only the service-role key may touch this table.
-- Merchants reach it through /api/dashboard/payment-gateways.
ALTER TABLE store_payment_gateways ENABLE ROW LEVEL SECURITY;
