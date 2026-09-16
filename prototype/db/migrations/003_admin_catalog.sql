ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'registration';
ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('registration', 'active', 'client', 'blocked'));

ALTER TABLE balance_transactions ADD COLUMN IF NOT EXISTS payment_provider text;
ALTER TABLE balance_transactions ADD COLUMN IF NOT EXISTS payment_reference text;

ALTER TABLE administrators ADD COLUMN IF NOT EXISTS nickname text;
ALTER TABLE administrators ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE administrators ADD COLUMN IF NOT EXISTS pin_hash text;
ALTER TABLE administrators ADD COLUMN IF NOT EXISTS ip_allowlist cidr[] NOT NULL DEFAULT ARRAY[]::cidr[];
ALTER TABLE administrators ADD COLUMN IF NOT EXISTS password_set_at timestamptz;

CREATE TABLE IF NOT EXISTS admin_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  invited_by uuid REFERENCES administrators(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_invitations_email_idx ON admin_invitations(email, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_providers (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_updated_at timestamptz,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_models (
  id text PRIMARY KEY,
  provider_id text NOT NULL REFERENCES ai_providers(id) ON UPDATE CASCADE,
  display_name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  cost_input_per_1m_usd numeric(14,6) NOT NULL DEFAULT 0,
  cost_cached_input_per_1m_usd numeric(14,6),
  cost_output_per_1m_usd numeric(14,6) NOT NULL DEFAULT 0,
  client_input_per_1m_usd numeric(14,6) NOT NULL DEFAULT 0,
  client_cached_input_per_1m_usd numeric(14,6),
  client_output_per_1m_usd numeric(14,6) NOT NULL DEFAULT 0,
  markup_multiplier numeric(8,4) NOT NULL DEFAULT 2.5,
  baseline_score integer NOT NULL DEFAULT 1000,
  baseline_votes integer NOT NULL DEFAULT 0,
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_updated_at timestamptz,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_models_provider_active_idx ON ai_models(provider_id, active, display_name);

CREATE TABLE IF NOT EXISTS catalog_sync_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  payload_hash text NOT NULL,
  provider_count integer NOT NULL DEFAULT 0,
  model_count integer NOT NULL DEFAULT 0,
  received_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz
);

ALTER TABLE model_feedback ADD COLUMN IF NOT EXISTS model_id text;

UPDATE users SET status='active', email_verified_at=COALESCE(email_verified_at, created_at)
WHERE status='active';
