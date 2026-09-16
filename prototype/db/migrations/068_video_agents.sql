ALTER TABLE system_agent_overrides
  ADD COLUMN IF NOT EXISTS provider_id text,
  ADD COLUMN IF NOT EXISTS video_mode text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS video_preview_url text,
  ADD COLUMN IF NOT EXISTS prompt_placeholder text,
  ADD COLUMN IF NOT EXISTS reference_inputs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS video_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE video_jobs
  ADD COLUMN IF NOT EXISTS agent_id text,
  ADD COLUMN IF NOT EXISTS agent_label text;

ALTER TABLE video_generations
  ADD COLUMN IF NOT EXISTS agent_id text,
  ADD COLUMN IF NOT EXISTS agent_label text;
