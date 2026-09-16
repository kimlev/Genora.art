CREATE TABLE IF NOT EXISTS generation_jobs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('chat', 'image', 'video', 'music')),
  surface text NOT NULL CHECK (surface IN ('chat', 'images', 'audio')),
  conversation_id text,
  status text NOT NULL CHECK (status IN ('creating', 'ready', 'failed')),
  title text,
  model_label text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  error text,
  acked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS generation_jobs_user_status_idx
  ON generation_jobs(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS generation_jobs_creating_idx
  ON generation_jobs(status, created_at)
  WHERE status = 'creating';
