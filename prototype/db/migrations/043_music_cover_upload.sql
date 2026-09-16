ALTER TABLE music_tracks ADD COLUMN IF NOT EXISTS cover_upload bytea;
ALTER TABLE music_tracks ADD COLUMN IF NOT EXISTS cover_upload_mime text;
