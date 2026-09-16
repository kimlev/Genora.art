ALTER TABLE payment_invoices
  ADD COLUMN IF NOT EXISTS provider_invoice_id text;

ALTER TABLE payment_providers
  ADD COLUMN IF NOT EXISTS fx_rate_url text;

ALTER TABLE payment_providers
  ADD COLUMN IF NOT EXISTS fx_rounding integer;

ALTER TABLE payment_providers DROP CONSTRAINT IF EXISTS payment_providers_fx_rounding_check;
ALTER TABLE payment_providers
  ADD CONSTRAINT payment_providers_fx_rounding_check
  CHECK (fx_rounding IS NULL OR (fx_rounding >= 0 AND fx_rounding <= 8));
