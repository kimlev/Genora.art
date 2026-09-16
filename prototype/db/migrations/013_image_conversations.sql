CREATE TABLE IF NOT EXISTS image_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Новая генерация',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS image_conversations_user_updated_idx
  ON image_conversations(user_id, updated_at DESC);

ALTER TABLE image_generations
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES image_conversations(id) ON DELETE CASCADE;

DO $$
DECLARE
  generation_row record;
  new_conversation_id uuid;
BEGIN
  FOR generation_row IN
    SELECT id, user_id, prompt, created_at
    FROM image_generations
    WHERE conversation_id IS NULL
    ORDER BY created_at
  LOOP
    new_conversation_id := gen_random_uuid();
    INSERT INTO image_conversations(id, user_id, title, created_at, updated_at)
    VALUES (
      new_conversation_id,
      generation_row.user_id,
      COALESCE(NULLIF(left(regexp_replace(generation_row.prompt, '[[:space:]]+', ' ', 'g'), 80), ''), 'Генерация изображения'),
      generation_row.created_at,
      generation_row.created_at
    );
    UPDATE image_generations
    SET conversation_id = new_conversation_id
    WHERE id = generation_row.id;
  END LOOP;
END $$;

ALTER TABLE image_generations
  ALTER COLUMN conversation_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS image_generations_conversation_created_idx
  ON image_generations(conversation_id, created_at DESC);
