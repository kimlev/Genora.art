CREATE TABLE IF NOT EXISTS media_titles (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('photo', 'video')),
  asset_id text NOT NULL,
  title text NOT NULL CHECK (title = '' OR char_length(title) BETWEEN 4 AND 30),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind, asset_id)
);
