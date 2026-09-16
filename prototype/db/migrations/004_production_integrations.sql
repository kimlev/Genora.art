CREATE TABLE IF NOT EXISTS email_verification_tokens (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_verification_tokens_user_idx
  ON email_verification_tokens(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS email_verification_tokens_expires_idx
  ON email_verification_tokens(expires_at);

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  bucket_key text PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS billing_multiplier numeric(8,4) NOT NULL DEFAULT 2.5;
ALTER TABLE ai_providers DROP CONSTRAINT IF EXISTS ai_providers_billing_multiplier_check;
ALTER TABLE ai_providers ADD CONSTRAINT ai_providers_billing_multiplier_check
  CHECK (billing_multiplier >= 0 AND billing_multiplier <= 100);

UPDATE ai_providers p SET billing_multiplier = source.multiplier
FROM (
  SELECT provider_id, coalesce(avg(markup_multiplier), 2.5) multiplier
  FROM ai_models GROUP BY provider_id
) source
WHERE source.provider_id = p.id;

ALTER TABLE usage_entries ADD COLUMN IF NOT EXISTS cached_input_tokens integer NOT NULL DEFAULT 0;
ALTER TABLE usage_entries ADD COLUMN IF NOT EXISTS thinking_tokens integer NOT NULL DEFAULT 0;
ALTER TABLE usage_entries ADD COLUMN IF NOT EXISTS billed_tokens bigint NOT NULL DEFAULT 0;
ALTER TABLE usage_entries ADD COLUMN IF NOT EXISTS billing_multiplier numeric(8,4) NOT NULL DEFAULT 1;
ALTER TABLE usage_entries ADD COLUMN IF NOT EXISTS tool_cost_usd numeric(14,6) NOT NULL DEFAULT 0;
ALTER TABLE usage_entries ADD COLUMN IF NOT EXISTS latency_ms integer;
ALTER TABLE usage_entries ADD COLUMN IF NOT EXISTS integrator_chat_id text;
ALTER TABLE usage_entries DROP CONSTRAINT IF EXISTS usage_entries_billing_multiplier_check;
ALTER TABLE usage_entries ADD CONSTRAINT usage_entries_billing_multiplier_check
  CHECK (billing_multiplier >= 0 AND billing_multiplier <= 100);
CREATE UNIQUE INDEX IF NOT EXISTS usage_entries_upstream_request_unique
  ON usage_entries(upstream_request_id) WHERE upstream_request_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS pricing_multiplier_changes (
  id bigserial PRIMARY KEY,
  batch_id uuid NOT NULL DEFAULT gen_random_uuid(),
  administrator_id uuid REFERENCES administrators(id) ON DELETE SET NULL,
  requested_scope text NOT NULL CHECK (requested_scope IN ('global', 'provider')),
  provider_id text NOT NULL REFERENCES ai_providers(id) ON UPDATE CASCADE,
  previous_multiplier numeric(8,4) NOT NULL,
  new_multiplier numeric(8,4) NOT NULL,
  affected_models integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pricing_multiplier_changes_created_idx
  ON pricing_multiplier_changes(created_at DESC);
CREATE INDEX IF NOT EXISTS pricing_multiplier_changes_provider_idx
  ON pricing_multiplier_changes(provider_id, created_at DESC);

ALTER TABLE usage_entries ADD COLUMN IF NOT EXISTS pricing_change_id bigint
  REFERENCES pricing_multiplier_changes(id) ON DELETE SET NULL;

UPDATE usage_entries
SET billed_tokens = input_tokens + output_tokens
WHERE billed_tokens = 0 AND input_tokens + output_tokens > 0;

CREATE INDEX IF NOT EXISTS usage_entries_pricing_change_idx
  ON usage_entries(pricing_change_id, user_id);
