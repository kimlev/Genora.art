CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value_int integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO site_settings(key, value_int)
VALUES ('registration_bonus_thousands', 20)
ON CONFLICT (key) DO NOTHING;
