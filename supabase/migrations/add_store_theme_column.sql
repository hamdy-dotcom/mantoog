-- Add theme column to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'classic';
