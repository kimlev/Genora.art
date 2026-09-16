CREATE TABLE IF NOT EXISTS characters (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name varchar(30) NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 30),
  status text NOT NULL DEFAULT 'creating' CHECK (status IN ('creating', 'ready', 'failed')),
  source_asset_ids text[] NOT NULL DEFAULT '{}',
  sheet_asset_ids text[] NOT NULL DEFAULT '{}',
  job_id uuid REFERENCES generation_jobs(id) ON DELETE SET NULL,
  provider text,
  model_id text,
  model_label text,
  error text,
  consent_confirmed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS characters_one_active_per_user_idx
  ON characters(user_id)
  WHERE status IN ('creating', 'ready');

CREATE INDEX IF NOT EXISTS characters_user_created_idx
  ON characters(user_id, created_at DESC);
