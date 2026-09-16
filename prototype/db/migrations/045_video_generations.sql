CREATE TABLE IF NOT EXISTS video_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES image_conversations(id) ON DELETE CASCADE,
  request_id text NOT NULL UNIQUE,
  provider text NOT NULL,
  model_id text NOT NULL,
  model_label text NOT NULL,
  prompt text NOT NULL,
  mode text NOT NULL,
  duration_sec integer NOT NULL,
  resolution text NOT NULL,
  aspect_ratio text NOT NULL,
  sound text NOT NULL,
  style text NOT NULL,
  asset_ids text[] NOT NULL,
  cost_usd numeric(14,6) NOT NULL,
  billing_multiplier numeric(8,4) NOT NULL,
  billed_tokens bigint NOT NULL,
  latency_ms integer,
  usage_entry_id text REFERENCES usage_entries(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS video_generations_user_created_idx
  ON video_generations(user_id, deleted_at, created_at DESC);

CREATE INDEX IF NOT EXISTS video_generations_conversation_created_idx
  ON video_generations(conversation_id, created_at DESC);
