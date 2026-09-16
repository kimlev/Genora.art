CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text,
  nickname text,
  avatar_data_url text,
  timezone text,
  ai_tone text,
  ai_preferences text,
  balance_tokens bigint NOT NULL DEFAULT 20000 CHECK (balance_tokens >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS conversations (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  model_id text,
  provider_id text,
  depth_id text,
  agent_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conversations_user_updated_idx ON conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  model_id text,
  token_count integer,
  thinking_ms integer,
  image text,
  link_href text,
  link_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_conversation_created_idx ON messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS custom_agents (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  system_prompt text NOT NULL,
  icon text NOT NULL,
  model_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
CREATE INDEX IF NOT EXISTS custom_agents_user_idx ON custom_agents(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS usage_entries (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id text,
  battle_id uuid,
  chat_title text NOT NULL,
  model text NOT NULL,
  agent text NOT NULL,
  input_tokens integer NOT NULL CHECK (input_tokens >= 0),
  output_tokens integer NOT NULL CHECK (output_tokens >= 0),
  deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS usage_entries_user_created_idx ON usage_entries(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS model_feedback (
  message_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model_name text NOT NULL,
  vote smallint NOT NULL CHECK (vote IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);
CREATE INDEX IF NOT EXISTS model_feedback_model_idx ON model_feedback(model_name);

CREATE TABLE IF NOT EXISTS balance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('top_up', 'usage', 'adjustment')),
  token_delta bigint NOT NULL,
  amount_usd numeric(12,2),
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS balance_transactions_user_created_idx ON balance_transactions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS model_battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  agent_id text,
  left_provider text NOT NULL,
  left_model text NOT NULL,
  left_depth text NOT NULL,
  right_provider text NOT NULL,
  right_model text NOT NULL,
  right_depth text NOT NULL,
  preferred_side text CHECK (preferred_side IN ('left', 'right')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS model_battles_user_created_idx ON model_battles(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS battle_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id uuid NOT NULL REFERENCES model_battles(id) ON DELETE CASCADE,
  side text NOT NULL CHECK (side IN ('left', 'right')),
  model_id text NOT NULL,
  content text NOT NULL,
  input_tokens integer NOT NULL CHECK (input_tokens >= 0),
  output_tokens integer NOT NULL CHECK (output_tokens >= 0),
  thinking_ms integer NOT NULL CHECK (thinking_ms >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (battle_id, side)
);

CREATE TABLE IF NOT EXISTS support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  topic text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usage_entries_battle_fk') THEN
    ALTER TABLE usage_entries
      ADD CONSTRAINT usage_entries_battle_fk
      FOREIGN KEY (battle_id) REFERENCES model_battles(id) ON DELETE SET NULL;
  END IF;
END $$;
