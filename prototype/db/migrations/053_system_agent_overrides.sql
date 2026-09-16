CREATE TABLE IF NOT EXISTS system_agent_overrides (
  id text PRIMARY KEY,
  name text,
  description text,
  category text,
  tag text,
  icon text,
  cover_url text,
  model_id text,
  system_prompt text,
  created boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS system_agent_overrides_created_idx ON system_agent_overrides (created, updated_at DESC);
