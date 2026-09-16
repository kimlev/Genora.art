CREATE TABLE IF NOT EXISTS music_tag_prompts (
  kind text NOT NULL,
  id text NOT NULL,
  label_ru text NOT NULL,
  label_en text NOT NULL,
  prompt_en text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, id)
);
