-- Surf scaling: boost daily budget intraday, auto-revert at end of ad-account day
CREATE TABLE IF NOT EXISTS tiktok_scaling_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  advertiser_id text NOT NULL,
  entity_level text NOT NULL CHECK (entity_level IN ('campaigns', 'adgroups')),
  entity_id text NOT NULL,
  original_budget numeric NOT NULL,
  boosted_budget numeric NOT NULL,
  currency text,
  revert_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reverted', 'failed', 'cancelled')),
  is_smart_plus boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  reverted_at timestamptz,
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_tiktok_scaling_tasks_pending_revert
  ON tiktok_scaling_tasks (revert_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_tiktok_scaling_tasks_status_revert
  ON tiktok_scaling_tasks (status, revert_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tiktok_scaling_tasks_active_entity
  ON tiktok_scaling_tasks (store_id, advertiser_id, entity_level, entity_id)
  WHERE status = 'pending';
