-- Текст ошибки от платёжного провайдера: без него в админке видно только «Ошибка».
ALTER TABLE payment_invoices
  ADD COLUMN IF NOT EXISTS failure_reason text;
