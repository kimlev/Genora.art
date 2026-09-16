-- Метод оплаты работает не везде: СБП существует только в России, а карточный
-- шлюз — почти во всём мире. Пустой список стран означает «весь мир», как у провайдера.
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS country_codes text[] NOT NULL DEFAULT ARRAY[]::text[];

UPDATE payment_methods SET country_codes = ARRAY['RU'] WHERE id = 'sbp' AND cardinality(country_codes) = 0;
