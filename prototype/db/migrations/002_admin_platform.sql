ALTER TABLE users ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'blocked'));

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_address inet;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS country_code char(2);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS administrators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash text PRIMARY KEY,
  administrator_id uuid NOT NULL REFERENCES administrators(id) ON DELETE CASCADE,
  ip_address inet,
  country_code char(2),
  user_agent text,
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_sessions_admin_idx ON admin_sessions(administrator_id);
CREATE INDEX IF NOT EXISTS admin_sessions_expires_idx ON admin_sessions(expires_at);

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id bigserial PRIMARY KEY,
  email text NOT NULL,
  ip_address inet,
  success boolean NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_login_attempts_lookup_idx ON admin_login_attempts(email, attempted_at DESC);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id bigserial PRIMARY KEY,
  administrator_id uuid REFERENCES administrators(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_created_idx ON admin_audit_log(created_at DESC);

ALTER TABLE usage_entries ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE usage_entries ADD COLUMN IF NOT EXISTS model_id text;
ALTER TABLE usage_entries ADD COLUMN IF NOT EXISTS cost_input_per_1m_usd numeric(14,6) NOT NULL DEFAULT 0;
ALTER TABLE usage_entries ADD COLUMN IF NOT EXISTS cost_output_per_1m_usd numeric(14,6) NOT NULL DEFAULT 0;
ALTER TABLE usage_entries ADD COLUMN IF NOT EXISTS client_input_per_1m_usd numeric(14,6) NOT NULL DEFAULT 0;
ALTER TABLE usage_entries ADD COLUMN IF NOT EXISTS client_output_per_1m_usd numeric(14,6) NOT NULL DEFAULT 0;
ALTER TABLE usage_entries ADD COLUMN IF NOT EXISTS cost_usd numeric(14,6) NOT NULL DEFAULT 0;
ALTER TABLE usage_entries ADD COLUMN IF NOT EXISTS revenue_usd numeric(14,6) NOT NULL DEFAULT 0;
ALTER TABLE usage_entries ADD COLUMN IF NOT EXISTS currency char(3) NOT NULL DEFAULT 'USD';
ALTER TABLE usage_entries ADD COLUMN IF NOT EXISTS upstream_request_id text;

CREATE TABLE IF NOT EXISTS payment_providers (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  client_visible boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 100,
  currencies text[] NOT NULL DEFAULT ARRAY['USD']::text[],
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  secret_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO payment_providers(id, display_name, enabled, client_visible, sort_order, currencies)
VALUES
  ('stripe', 'Stripe', false, false, 10, ARRAY['USD','EUR']),
  ('paypal', 'PayPal', false, false, 20, ARRAY['USD','EUR']),
  ('manual', 'Ручной платёж', false, false, 100, ARRAY['USD'])
ON CONFLICT (id) DO NOTHING;
