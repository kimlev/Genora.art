CREATE TABLE IF NOT EXISTS youtube_settings (
  id text PRIMARY KEY DEFAULT 'default',
  channel_id text,
  channel_title text,
  channel_handle text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes text[] NOT NULL DEFAULT '{}',
  ai_provider text,
  ai_model text,
  default_language text NOT NULL DEFAULT 'ru',
  default_privacy text NOT NULL DEFAULT 'private' CHECK (default_privacy IN ('private','unlisted','public')),
  default_category_id text NOT NULL DEFAULT '28',
  timezone text NOT NULL DEFAULT 'Europe/Minsk',
  research_queries text[] NOT NULL DEFAULT '{}',
  automation_enabled boolean NOT NULL DEFAULT false,
  research_interval_hours integer NOT NULL DEFAULT 168 CHECK (research_interval_hours BETWEEN 6 AND 720),
  analytics_interval_hours integer NOT NULL DEFAULT 24 CHECK (analytics_interval_hours BETWEEN 6 AND 720),
  next_research_at timestamptz,
  next_analytics_at timestamptz,
  updated_by uuid REFERENCES administrators(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO youtube_settings(id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS youtube_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  topic text NOT NULL,
  target_audience text NOT NULL DEFAULT '',
  goal text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT 'ru',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','ready','scheduled','published','failed','archived')),
  current_stage text NOT NULL DEFAULT 'research' CHECK (current_stage IN ('research','plan','script','package','production','publish','analytics','done')),
  video_asset_id text,
  scheduled_at timestamptz,
  publish_approved_at timestamptz,
  published_video_id text,
  published_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES administrators(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS youtube_projects_status_stage_idx
  ON youtube_projects(status,current_stage,updated_at DESC);

CREATE TABLE IF NOT EXISTS youtube_stage_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES youtube_projects(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('research','plan','script','package','production','publish','analytics')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('queued','running','completed','failed','needs_review')),
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_by uuid REFERENCES administrators(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS youtube_stage_runs_project_idx
  ON youtube_stage_runs(project_id,stage,started_at DESC);

CREATE TABLE IF NOT EXISTS youtube_oauth_states (
  token_hash text PRIMARY KEY,
  administrator_id uuid NOT NULL REFERENCES administrators(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS youtube_oauth_states_expires_idx ON youtube_oauth_states(expires_at);
