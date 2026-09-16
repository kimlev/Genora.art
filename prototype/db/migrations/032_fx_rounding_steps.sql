ALTER TABLE payment_providers DROP CONSTRAINT IF EXISTS payment_providers_fx_rounding_check;
ALTER TABLE payment_providers
  ADD CONSTRAINT payment_providers_fx_rounding_check
  CHECK (fx_rounding IS NULL OR (fx_rounding >= -2 AND fx_rounding <= 2));
