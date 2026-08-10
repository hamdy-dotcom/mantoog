-- Snapchat Conversion API (CAPI) support.
--
-- The CAPI access token is a SECRET. The storefront product page does
-- `stores.select('*')` client-side, so the token must NOT live on `stores`
-- (it would ship to the browser). It lives in its own table with RLS enabled
-- and NO policies, so only the service-role client (which bypasses RLS) can
-- read or write it. The public Pixel ID stays on `stores.snapchat_pixel_id`.

CREATE TABLE IF NOT EXISTS snapchat_capi (
  store_id        uuid PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  merchant_id     uuid NOT NULL,
  capi_token      text,                       -- Snap "Pixel token" (server-only)
  enabled         boolean NOT NULL DEFAULT false,
  test_event_code text,                       -- optional, for Snap Test Events
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE snapchat_capi ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: only the service-role key may touch this table.
--
-- Note: the Snap Click ID (sccid) is captured from the landing URL and passed
-- straight into the CAPI Purchase event at order time — it is NOT stored on the
-- orders table, so this migration only needs to create the table above.
