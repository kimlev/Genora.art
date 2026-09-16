ALTER TABLE music_tracks
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS music_tracks_user_deleted_idx
  ON music_tracks(user_id, deleted_at, created_at DESC);

ALTER TABLE image_conversations
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE image_generations
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS image_conversations_user_deleted_idx
  ON image_conversations(user_id, deleted_at, updated_at DESC);

CREATE INDEX IF NOT EXISTS image_generations_user_deleted_idx
  ON image_generations(user_id, deleted_at, created_at DESC);
