ALTER TABLE custom_agents ADD COLUMN IF NOT EXISTS context text NOT NULL DEFAULT 'writing';

CREATE TABLE IF NOT EXISTS welcome_bonus_settings (
  version integer PRIMARY KEY,
  config jsonb NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS welcome_bonus_setting_logs (
  id bigserial PRIMARY KEY,
  version integer NOT NULL,
  admin_email text NOT NULL,
  changes jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS welcome_bonus_campaigns (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  version integer NOT NULL,
  config jsonb NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  credited_at timestamptz,
  dismissed_on date,
  login_days text[] NOT NULL DEFAULT '{}',
  last_login_utc date,
  text_requests integer NOT NULL DEFAULT 0,
  images integer NOT NULL DEFAULT 0,
  tracks integer NOT NULL DEFAULT 0,
  referrals integer NOT NULL DEFAULT 0,
  referral_code text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS welcome_bonus_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visitor_key text NOT NULL,
  invited_user_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  UNIQUE (referrer_id, visitor_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS welcome_bonus_referrals_invitee_idx
  ON welcome_bonus_referrals(invited_user_id) WHERE invited_user_id IS NOT NULL;

INSERT INTO welcome_bonus_settings(version, config, created_by)
SELECT 1, '{
  "login":{"maxBonus":10000,"required":5},
  "texts":{"maxBonus":10000,"required":20},
  "images":{"maxBonus":20000,"required":10},
  "tracks":{"maxBonus":20000,"required":5},
  "friends":{"maxBonus":40000,"required":5}
}'::jsonb, 'system'
WHERE NOT EXISTS (SELECT 1 FROM welcome_bonus_settings);
