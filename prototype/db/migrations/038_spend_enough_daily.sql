CREATE TABLE IF NOT EXISTS spend_enough_daily (
  day date PRIMARY KEY,
  text_tokens integer NOT NULL,
  image_tokens integer NOT NULL,
  text_avg_usd numeric,
  image_avg_usd numeric,
  computed_at timestamptz NOT NULL DEFAULT now()
);
