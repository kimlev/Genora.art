CREATE TABLE IF NOT EXISTS image_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id text NOT NULL UNIQUE,
  provider text NOT NULL,
  model_id text NOT NULL,
  model_label text NOT NULL,
  prompt text NOT NULL,
  size text NOT NULL,
  format text NOT NULL,
  style text NOT NULL,
  reasoning text,
  asset_ids text[] NOT NULL,
  cost_usd numeric(14,6) NOT NULL,
  billing_multiplier numeric(8,4) NOT NULL,
  billed_tokens bigint NOT NULL,
  latency_ms integer,
  usage_entry_id text REFERENCES usage_entries(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS image_generations_user_created_idx
  ON image_generations(user_id, created_at DESC);
