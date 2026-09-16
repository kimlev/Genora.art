ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_country text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_line text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS postal_code text;
