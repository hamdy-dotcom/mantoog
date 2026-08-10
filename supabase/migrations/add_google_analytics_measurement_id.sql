-- Add Google Analytics 4 Measurement ID to stores for visitor tracking.
alter table stores add column if not exists google_analytics_measurement_id text;
