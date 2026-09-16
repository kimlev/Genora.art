ALTER TABLE users
  ADD COLUMN IF NOT EXISTS paid_balance_tokens bigint NOT NULL DEFAULT 0;

UPDATE usage_entries SET revenue_usd = 0;

DO $$
DECLARE
  account record;
  tx record;
  running_balance bigint;
  running_paid bigint;
  spend bigint;
  gift bigint;
  from_paid bigint;
BEGIN
  FOR account IN SELECT id, balance_tokens FROM users LOOP
    running_balance := 0;
    running_paid := 0;
    FOR tx IN
      SELECT kind, token_delta, amount_usd
      FROM balance_transactions
      WHERE user_id = account.id
      ORDER BY created_at, id
    LOOP
      IF tx.token_delta > 0 THEN
        running_balance := running_balance + tx.token_delta;
        IF tx.kind = 'top_up' AND coalesce(tx.amount_usd, 0) > 0 THEN
          running_paid := running_paid + round(tx.amount_usd * 10000);
          IF running_paid > running_balance THEN
            running_paid := running_balance;
          END IF;
        END IF;
      ELSIF tx.token_delta < 0 THEN
        spend := -tx.token_delta;
        gift := GREATEST(0, running_balance - running_paid);
        from_paid := GREATEST(0, spend - gift);
        running_paid := GREATEST(0, running_paid - from_paid);
        running_balance := GREATEST(0, running_balance - spend);
      END IF;
    END LOOP;
    UPDATE users
      SET paid_balance_tokens = LEAST(GREATEST(0, running_paid), GREATEST(0, balance_tokens))
      WHERE id = account.id;
  END LOOP;
END $$;
