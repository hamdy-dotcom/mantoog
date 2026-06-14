-- Pending ad creatives awaiting Creative Management scope approval
CREATE TABLE IF NOT EXISTS tiktok_pending_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  advertiser_id text NOT NULL,
  campaign_id text NOT NULL,
  adgroup_id text NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  wizard_payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending_creative' CHECK (status IN ('pending_creative', 'published', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_tiktok_pending_ads_store
  ON tiktok_pending_ads (store_id, status);
