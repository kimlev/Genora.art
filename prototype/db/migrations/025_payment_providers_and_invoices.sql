-- Платёжный провайдер описывается в админке: ссылка на оплату, регион работы,
-- методы оплаты, валюта счёта и то, кто платит комиссию.
ALTER TABLE payment_providers ADD COLUMN IF NOT EXISTS checkout_url text;
-- Пустой список стран означает «весь мир».
ALTER TABLE payment_providers ADD COLUMN IF NOT EXISTS country_codes text[] NOT NULL DEFAULT ARRAY[]::text[];
ALTER TABLE payment_providers ADD COLUMN IF NOT EXISTS invoice_currency text NOT NULL DEFAULT 'usd';
ALTER TABLE payment_providers ADD COLUMN IF NOT EXISTS fee_payer text NOT NULL DEFAULT 'client';

ALTER TABLE payment_providers DROP CONSTRAINT IF EXISTS payment_providers_invoice_currency_check;
ALTER TABLE payment_providers
  ADD CONSTRAINT payment_providers_invoice_currency_check
  CHECK (invoice_currency IN ('usd', 'national'));

ALTER TABLE payment_providers DROP CONSTRAINT IF EXISTS payment_providers_fee_payer_check;
ALTER TABLE payment_providers
  ADD CONSTRAINT payment_providers_fee_payer_check
  CHECK (fee_payer IN ('client', 'merchant'));

-- Название метода оплаты пишется один раз и на все языки не переводится,
-- поэтому лежит как есть. Логотип держим в базе: контейнер приложения
-- пересоздаётся на каждом деплое и файл, загруженный из админки, не сохранился бы.
CREATE TABLE IF NOT EXISTS payment_methods (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  logo_mime text,
  logo_bytes bytea,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_provider_methods (
  provider_id text NOT NULL REFERENCES payment_providers(id) ON DELETE CASCADE,
  method_id text NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
  PRIMARY KEY (provider_id, method_id)
);

CREATE INDEX IF NOT EXISTS payment_provider_methods_method_idx
  ON payment_provider_methods(method_id);

-- Номер счёта виден клиенту и в поддержке, поэтому он короткий и последовательный,
-- а не случайный идентификатор строки.
CREATE SEQUENCE IF NOT EXISTS payment_invoice_number_seq;

CREATE TABLE IF NOT EXISTS payment_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE DEFAULT 'MS-' || lpad(nextval('payment_invoice_number_seq')::text, 6, '0'),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  provider_id text REFERENCES payment_providers(id) ON DELETE SET NULL,
  method_id text REFERENCES payment_methods(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL,
  currency char(3) NOT NULL,
  -- Заполняется, когда провайдер подтвердит платёж: сумма может отличаться
  -- из-за комиссии и конвертации, поэтому валюта зачисления хранится отдельно.
  credited_amount numeric(14,2),
  credited_currency char(3),
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'paid', 'failed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_invoices_created_idx ON payment_invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS payment_invoices_provider_idx ON payment_invoices(provider_id);
CREATE INDEX IF NOT EXISTS payment_invoices_user_idx ON payment_invoices(user_id, created_at DESC);
