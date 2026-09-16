ALTER TABLE usage_entries ADD COLUMN IF NOT EXISTS billed_input_tokens bigint;
ALTER TABLE usage_entries ADD COLUMN IF NOT EXISTS billed_output_tokens bigint;

CREATE INDEX IF NOT EXISTS usage_entries_user_created_billed_idx
  ON usage_entries(user_id, created_at DESC)
  INCLUDE (billed_input_tokens, billed_output_tokens, billed_tokens, cost_usd, revenue_usd);
