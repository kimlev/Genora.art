CREATE TABLE IF NOT EXISTS battle_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  agent_id text,
  left_provider text NOT NULL,
  left_model text NOT NULL,
  left_depth text NOT NULL,
  right_provider text NOT NULL,
  right_model text NOT NULL,
  right_depth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS battle_sessions_user_updated_idx
  ON battle_sessions(user_id, updated_at DESC);

ALTER TABLE model_battles ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES battle_sessions(id) ON DELETE CASCADE;

INSERT INTO battle_sessions(id,user_id,title,agent_id,left_provider,left_model,left_depth,right_provider,right_model,right_depth,created_at,updated_at)
SELECT battle.id,battle.user_id,left(regexp_replace(battle.prompt,'[\n\r]+',' ','g'),80),battle.agent_id,
  battle.left_provider,battle.left_model,battle.left_depth,battle.right_provider,battle.right_model,battle.right_depth,
  battle.created_at,battle.created_at
FROM model_battles battle
WHERE battle.session_id IS NULL
ON CONFLICT (id) DO NOTHING;

UPDATE model_battles SET session_id=id WHERE session_id IS NULL;
ALTER TABLE model_battles ALTER COLUMN session_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS model_battles_session_created_idx ON model_battles(session_id,created_at);

ALTER TABLE battle_responses
  ADD COLUMN IF NOT EXISTS billed_input_tokens bigint,
  ADD COLUMN IF NOT EXISTS billed_output_tokens bigint;

UPDATE battle_responses response
SET billed_input_tokens=coalesce(usage.billed_input_tokens,response.input_tokens),
  billed_output_tokens=coalesce(usage.billed_output_tokens,response.output_tokens)
FROM usage_entries usage
WHERE usage.id='battle-'||response.battle_id::text||'-'||response.side
  AND (response.billed_input_tokens IS NULL OR response.billed_output_tokens IS NULL);

UPDATE battle_responses
SET billed_input_tokens=coalesce(billed_input_tokens,input_tokens),
  billed_output_tokens=coalesce(billed_output_tokens,output_tokens)
WHERE billed_input_tokens IS NULL OR billed_output_tokens IS NULL;

ALTER TABLE battle_responses
  ALTER COLUMN billed_input_tokens SET NOT NULL,
  ALTER COLUMN billed_output_tokens SET NOT NULL;
