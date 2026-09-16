ALTER TABLE payment_invoices
  ADD COLUMN IF NOT EXISTS amount_usd numeric(14,2);

UPDATE payment_invoices
SET amount_usd = amount
WHERE amount_usd IS NULL;

ALTER TABLE payment_invoices
  ALTER COLUMN amount_usd SET NOT NULL;

UPDATE payment_providers SET
  invoice_currency = 'national',
  country_codes = CASE
    WHEN cardinality(country_codes) = 0 THEN ARRAY['RU']::text[]
    WHEN 'RU' = ANY(country_codes) THEN country_codes
    ELSE country_codes || ARRAY['RU']::text[]
  END,
  currencies = ARRAY['USD', 'RUB'],
  fx_rate_url = 'https://www.cbr.ru/scripts/XML_daily.asp',
  fx_rounding = COALESCE(fx_rounding, 2),
  updated_at = now()
WHERE id = 'streampay';
