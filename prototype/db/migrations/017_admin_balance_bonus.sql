ALTER TABLE balance_transactions
  DROP CONSTRAINT IF EXISTS balance_transactions_kind_check;

ALTER TABLE balance_transactions
  ADD CONSTRAINT balance_transactions_kind_check
  CHECK (kind IN ('top_up', 'usage', 'adjustment', 'bonus'));
