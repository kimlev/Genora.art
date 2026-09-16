-- StreamPay зачисляет на кошелёк в USDT: три символа не хватает.
ALTER TABLE payment_invoices
  ALTER COLUMN credited_currency TYPE varchar(8);
