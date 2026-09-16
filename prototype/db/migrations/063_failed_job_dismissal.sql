ALTER TABLE generation_jobs
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;

ALTER TABLE video_jobs
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;
