-- Ставка комиссии хранится отдельно от того, кто её платит: «магазин» или
-- «клиент» не говорит, сколько процентов удерживает провайдер.
ALTER TABLE payment_providers ADD COLUMN IF NOT EXISTS fee_percent numeric(6,3);

ALTER TABLE payment_providers DROP CONSTRAINT IF EXISTS payment_providers_fee_percent_check;
ALTER TABLE payment_providers
  ADD CONSTRAINT payment_providers_fee_percent_check
  CHECK (fee_percent IS NULL OR (fee_percent >= 0 AND fee_percent <= 100));
