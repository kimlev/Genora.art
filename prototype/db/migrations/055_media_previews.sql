ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS preview_mime TEXT;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS preview_bytes BYTEA;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS preview_byte_length INTEGER;

ALTER TABLE music_tracks ADD COLUMN IF NOT EXISTS cover_preview BYTEA;
ALTER TABLE music_tracks ADD COLUMN IF NOT EXISTS cover_preview_mime TEXT;
