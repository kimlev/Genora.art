ALTER TABLE usage_entries
  ADD COLUMN IF NOT EXISTS unpaid_tokens bigint NOT NULL DEFAULT 0;
