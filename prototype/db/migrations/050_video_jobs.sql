CREATE TABLE IF NOT EXISTS video_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES image_conversations(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('creating', 'ready', 'failed')),
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
  multiplier numeric(8,4) NOT NULL,
  locale text NOT NULL DEFAULT 'ru',
  integrator_request_id text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS video_jobs_user_status_idx
  ON video_jobs(user_id, status, created_at DESC);
