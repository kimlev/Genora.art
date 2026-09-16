ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE characters
  DROP CONSTRAINT IF EXISTS characters_kind_check;

ALTER TABLE characters
  ADD CONSTRAINT characters_kind_check CHECK (kind IN ('personal', 'ai')) NOT VALID;
