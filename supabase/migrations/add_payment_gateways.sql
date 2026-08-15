-- Per-store payment gateway credentials (PayTabs / Tabby / Tamara).
--
-- Gateway API keys are SECRETS. The storefront product page does
-- `stores.select('*')` client-side, so they must NOT live on `stores` (they
-- would ship to every visitor's browser) — same reasoning as `snapchat_capi`.
-- This table has RLS enabled and NO policies, so only the service-role client
-- (which bypasses RLS) can read or write it.
--
-- On top of that, every secret VALUE is encrypted at rest by the app
-- (AES-256-GCM, `v1:<iv>:<tag>:<ciphertext>`) using PAYMENTS_ENC_KEY, so a DB
-- dump or a leaked service-role key alone does not expose usable credentials.

CREATE TABLE IF NOT EXISTS store_payment_gateways (
  store_id      uuid        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  gateway       text        NOT NULL,                      -- 'paytabs' | 'tabby' | 'tamara'
  merchant_id   uuid        NOT NULL,
  enabled       boolean     NOT NULL DEFAULT false,

  -- public_config holds non-secret settings (profile id, merchant code, region,
  -- widget public keys) in plaintext — it is returned to the browser as-is.
  -- credentials holds secrets, each VALUE independently encrypted.
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

ALTER TABLE store_payment_gateways ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: only the service-role key may touch this table.
-- Merchants reach it exclusively through /api/dashboard/payment-gateways,
-- which never returns a secret value (only `set` + last-4 `tail`).
