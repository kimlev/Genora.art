CREATE TABLE generation_request_registry (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('chat','image','video','music')),
  provider text,
  model_id text,
  model_label text,
  agent text,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','error')),
  error text,
  response_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX generation_request_registry_created_idx
  ON generation_request_registry(created_at DESC);
CREATE INDEX generation_request_registry_user_created_idx
  ON generation_request_registry(user_id, created_at DESC);
