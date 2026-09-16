ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS complimentary boolean NOT NULL DEFAULT false;

WITH first_character AS (
  SELECT DISTINCT ON (user_id) id
    FROM characters
   WHERE status IN ('creating', 'ready')
   ORDER BY user_id, created_at ASC
)
UPDATE characters
   SET complimentary=true
 WHERE id IN (SELECT id FROM first_character);

DROP INDEX IF EXISTS characters_one_active_per_user_idx;

CREATE UNIQUE INDEX IF NOT EXISTS characters_one_complimentary_per_user_idx
  ON characters(user_id)
  WHERE complimentary=true AND status IN ('creating', 'ready');
