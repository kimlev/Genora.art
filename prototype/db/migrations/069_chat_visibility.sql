ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

CREATE INDEX IF NOT EXISTS conversations_user_visible_updated_idx
  ON conversations(user_id, updated_at DESC)
  WHERE hidden_at IS NULL;
