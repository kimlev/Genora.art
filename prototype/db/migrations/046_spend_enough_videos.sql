ALTER TABLE spend_enough_daily
  ADD COLUMN IF NOT EXISTS video_tokens integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_avg_usd numeric;
