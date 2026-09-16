ALTER TABLE users DROP CONSTRAINT IF EXISTS users_balance_tokens_check;

ALTER TABLE usage_entries
  ADD COLUMN IF NOT EXISTS billing_formula_version smallint NOT NULL DEFAULT 3;

ALTER TABLE balance_transactions
  ADD COLUMN IF NOT EXISTS usage_entry_id text REFERENCES usage_entries(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS balance_transactions_usage_entry_unique
  ON balance_transactions(usage_entry_id) WHERE usage_entry_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS billing_recalculation_audit (
  usage_entry_id text PRIMARY KEY REFERENCES usage_entries(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_billed_input_tokens bigint,
  old_billed_output_tokens bigint,
  old_billed_tokens bigint NOT NULL,
  old_revenue_usd numeric(14,6) NOT NULL,
  new_billed_input_tokens bigint NOT NULL,
  new_billed_output_tokens bigint NOT NULL,
  new_billed_tokens bigint NOT NULL,
  new_revenue_usd numeric(14,6) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_recalculation_audit_batch_idx
  ON billing_recalculation_audit(batch_id, user_id);

CREATE TEMP TABLE billing_transaction_links ON COMMIT DROP AS
WITH ranked_usage AS (
  SELECT id,user_id,billed_tokens,created_at,
    row_number() OVER (PARTITION BY user_id,billed_tokens ORDER BY created_at,id) position
  FROM usage_entries
), ranked_transactions AS (
  SELECT id,user_id,-token_delta billed_tokens,created_at,
    row_number() OVER (PARTITION BY user_id,-token_delta ORDER BY created_at,id) position
  FROM balance_transactions
  WHERE kind='usage' AND usage_entry_id IS NULL
)
SELECT usage_transaction.id transaction_id,usage.id usage_entry_id
FROM ranked_transactions usage_transaction
JOIN ranked_usage usage
  ON usage.user_id=usage_transaction.user_id
  AND usage.billed_tokens=usage_transaction.billed_tokens
  AND usage.position=usage_transaction.position
WHERE abs(extract(epoch FROM usage_transaction.created_at-usage.created_at)) <= 10;

DO $$
DECLARE
  unmatched_transaction_count bigint;
BEGIN
  SELECT count(*) INTO unmatched_transaction_count
  FROM balance_transactions usage_transaction
  WHERE usage_transaction.kind='usage'
    AND usage_transaction.usage_entry_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM billing_transaction_links link
      WHERE link.transaction_id=usage_transaction.id
    );

  IF unmatched_transaction_count > 0 THEN
    RAISE EXCEPTION 'Cannot safely link % historical usage transactions', unmatched_transaction_count;
  END IF;
END $$;

UPDATE balance_transactions usage_transaction
SET usage_entry_id=link.usage_entry_id
FROM billing_transaction_links link
WHERE usage_transaction.id=link.transaction_id;

CREATE TEMP TABLE billing_recalculation_batch AS
SELECT gen_random_uuid() batch_id;

CREATE TEMP TABLE billing_recalculation_work AS
WITH priced AS (
  SELECT usage.*,
    greatest(0,usage.input_tokens::numeric*greatest(0,usage.cost_input_per_1m_usd)) input_weight,
    greatest(0,usage.output_tokens::numeric*greatest(0,usage.cost_output_per_1m_usd)) output_weight,
    CASE
      WHEN usage.cost_usd > 0 AND usage.billing_multiplier > 0
        THEN greatest(1,round(usage.cost_usd*usage.billing_multiplier*10000))::bigint
      ELSE 0::bigint
    END new_billed_tokens
  FROM usage_entries usage
), split AS (
  SELECT priced.*,
    CASE
      WHEN input_weight+output_weight > 0 THEN input_weight/(input_weight+output_weight)
      WHEN input_tokens+output_tokens > 0 THEN input_tokens::numeric/(input_tokens+output_tokens)
      ELSE 0
    END input_share
  FROM priced
)
SELECT split.id usage_entry_id,split.user_id,
  least(new_billed_tokens,greatest(0,round(new_billed_tokens*input_share)::bigint)) new_billed_input_tokens,
  new_billed_tokens-least(new_billed_tokens,greatest(0,round(new_billed_tokens*input_share)::bigint)) new_billed_output_tokens,
  new_billed_tokens,
  (new_billed_tokens/10000.0)::numeric(14,6) new_revenue_usd
FROM split;

INSERT INTO billing_recalculation_audit(
  usage_entry_id,batch_id,user_id,old_billed_input_tokens,old_billed_output_tokens,
  old_billed_tokens,old_revenue_usd,new_billed_input_tokens,new_billed_output_tokens,
  new_billed_tokens,new_revenue_usd
)
SELECT usage.id,batch.batch_id,usage.user_id,usage.billed_input_tokens,usage.billed_output_tokens,
  usage.billed_tokens,usage.revenue_usd,work.new_billed_input_tokens,work.new_billed_output_tokens,
  work.new_billed_tokens,work.new_revenue_usd
FROM usage_entries usage
JOIN billing_recalculation_work work ON work.usage_entry_id=usage.id
CROSS JOIN billing_recalculation_batch batch
ON CONFLICT (usage_entry_id) DO NOTHING;

UPDATE usage_entries usage
SET billed_input_tokens=work.new_billed_input_tokens,
  billed_output_tokens=work.new_billed_output_tokens,
  billed_tokens=work.new_billed_tokens,
  revenue_usd=work.new_revenue_usd,
  billing_formula_version=3
FROM billing_recalculation_work work
WHERE usage.id=work.usage_entry_id;

UPDATE balance_transactions usage_transaction
SET token_delta=-work.new_billed_tokens
FROM billing_recalculation_work work
WHERE usage_transaction.usage_entry_id=work.usage_entry_id;

WITH user_message_map AS (
  SELECT usage.id usage_entry_id,work.new_billed_input_tokens token_count,
    (SELECT message.id FROM messages message
      WHERE message.conversation_id=usage.conversation_id AND message.role='user'
        AND message.created_at<=usage.created_at
      ORDER BY message.created_at DESC,message.id DESC LIMIT 1) message_id
  FROM usage_entries usage
  JOIN billing_recalculation_work work ON work.usage_entry_id=usage.id
  WHERE usage.conversation_id IS NOT NULL
)
UPDATE messages message
SET token_count=message_map.token_count
FROM user_message_map message_map
WHERE message.id=message_map.message_id;

WITH assistant_message_map AS (
  SELECT usage.id usage_entry_id,work.new_billed_output_tokens token_count,
    (SELECT message.id FROM messages message
      WHERE message.conversation_id=usage.conversation_id AND message.role='assistant'
        AND message.created_at>=usage.created_at
      ORDER BY message.created_at,message.id LIMIT 1) message_id
  FROM usage_entries usage
  JOIN billing_recalculation_work work ON work.usage_entry_id=usage.id
  WHERE usage.conversation_id IS NOT NULL
)
UPDATE messages message
SET token_count=message_map.token_count
FROM assistant_message_map message_map
WHERE message.id=message_map.message_id;

UPDATE users user_account
SET balance_tokens=ledger.balance_tokens,updated_at=now()
FROM (
  SELECT user_id,coalesce(sum(token_delta),0)::bigint balance_tokens
  FROM balance_transactions
  GROUP BY user_id
) ledger
WHERE user_account.id=ledger.user_id;
