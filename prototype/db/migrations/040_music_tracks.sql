CREATE TABLE IF NOT EXISTS music_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id text NOT NULL UNIQUE,
  provider text NOT NULL,
  model_id text NOT NULL,
  model_label text NOT NULL,
  title text NOT NULL,
  mode text NOT NULL,
  genre text,
  style text,
  mood text,
  purpose text,
  duration_sec integer,
  lyrics text,
  prompt text NOT NULL DEFAULT '',
  asset_id text NOT NULL,
  mime text NOT NULL DEFAULT 'audio/mpeg',
  formats text[] NOT NULL DEFAULT ARRAY['mp3']::text[],
  cover_asset_id text,
  billed_tokens bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS music_tracks_user_created_idx
  ON music_tracks(user_id, created_at DESC);
