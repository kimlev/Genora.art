ALTER TABLE usage_entries
  ADD COLUMN IF NOT EXISTS internal_only boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS usage_entries_internal_created_idx
  ON usage_entries(internal_only, created_at DESC);
