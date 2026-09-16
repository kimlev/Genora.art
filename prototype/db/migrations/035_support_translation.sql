ALTER TABLE support_requests
  ADD COLUMN IF NOT EXISTS translation_ru text,
  ADD COLUMN IF NOT EXISTS translated_at timestamptz;
