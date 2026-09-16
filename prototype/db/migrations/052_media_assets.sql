CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'video', 'music')),
  mime TEXT NOT NULL,
  bytes BYTEA NOT NULL,
  byte_length INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS media_assets_kind_created ON media_assets (kind, created_at DESC);
