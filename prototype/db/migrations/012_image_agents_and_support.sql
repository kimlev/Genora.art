CREATE TABLE IF NOT EXISTS image_agents (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'image',
  mode text NOT NULL CHECK (mode IN ('T2I','EDIT','T2I_OR_EDIT')),
  input_min smallint NOT NULL DEFAULT 0 CHECK (input_min >= 0),
  input_max smallint NOT NULL DEFAULT 1 CHECK (input_max >= input_min),
  consent_required boolean NOT NULL DEFAULT false,
  prompt_template text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE image_generations ADD COLUMN IF NOT EXISTS image_agent_id text REFERENCES image_agents(id) ON DELETE SET NULL;
ALTER TABLE image_generations ADD COLUMN IF NOT EXISTS source_image_count smallint NOT NULL DEFAULT 0;

ALTER TABLE support_requests ADD COLUMN IF NOT EXISTS draft_reply text;
ALTER TABLE support_requests ADD COLUMN IF NOT EXISTS sent_reply text;
ALTER TABLE support_requests ADD COLUMN IF NOT EXISTS replied_at timestamptz;
ALTER TABLE support_requests ADD COLUMN IF NOT EXISTS replied_by uuid REFERENCES administrators(id) ON DELETE SET NULL;

ALTER TABLE usage_entries ADD COLUMN IF NOT EXISTS administrator_id uuid REFERENCES administrators(id) ON DELETE SET NULL;
ALTER TABLE usage_entries ADD COLUMN IF NOT EXISTS usage_comment text;

CREATE INDEX IF NOT EXISTS image_agents_active_sort_idx ON image_agents(active, sort_order);
CREATE INDEX IF NOT EXISTS support_requests_status_created_idx ON support_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS usage_entries_administrator_created_idx ON usage_entries(administrator_id, created_at DESC);
