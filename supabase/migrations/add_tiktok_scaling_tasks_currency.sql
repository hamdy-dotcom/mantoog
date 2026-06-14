-- Add currency to surf scaling tasks + composite index for cron queries
ALTER TABLE tiktok_scaling_tasks
  ADD COLUMN IF NOT EXISTS currency text;

CREATE INDEX IF NOT EXISTS idx_tiktok_scaling_tasks_status_revert
  ON tiktok_scaling_tasks (status, revert_at);
