WITH aligned AS (
  SELECT
    usage.conversation_id,
    usage.created_at,
    usage.user_id,
    GREATEST(0, CASE WHEN coalesce(usage.billed_input_tokens,0) > 0 THEN usage.billed_input_tokens ELSE coalesce(usage.input_tokens,0) END) AS source_input,
    GREATEST(0, CASE
      WHEN coalesce(usage.billed_tokens,0) > 0 THEN usage.billed_tokens
      ELSE
        CASE WHEN coalesce(usage.billed_input_tokens,0) > 0 THEN usage.billed_input_tokens ELSE coalesce(usage.input_tokens,0) END
        + CASE WHEN coalesce(usage.billed_output_tokens,0) > 0 THEN usage.billed_output_tokens ELSE coalesce(usage.output_tokens,0) END
    END) AS source_billed
  FROM usage_entries usage
  WHERE usage.conversation_id IS NOT NULL AND usage.deleted=false
),
ledger AS (
  SELECT
    conversation_id,
    created_at,
    user_id,
    (FLOOR(source_billed / 100.0) * 100)::int AS billed_tokens,
    LEAST(
      (FLOOR(source_billed / 100.0) * 100)::int,
      (FLOOR(source_input / 100.0) * 100)::int
    ) AS input_tokens
  FROM aligned
),
user_map AS (
  SELECT
    ledger.input_tokens AS token_count,
    (
      SELECT message.id
      FROM messages message
      JOIN conversations conversation ON conversation.id=message.conversation_id
      WHERE message.conversation_id=ledger.conversation_id
        AND conversation.user_id=ledger.user_id
        AND message.role='user'
        AND message.created_at<=ledger.created_at + interval '2 seconds'
      ORDER BY message.created_at DESC, message.id DESC
      LIMIT 1
    ) AS message_id
  FROM ledger
  WHERE ledger.billed_tokens > 0
)
UPDATE messages message
SET token_count=user_map.token_count
FROM user_map
WHERE message.id=user_map.message_id;

WITH aligned AS (
  SELECT
    usage.conversation_id,
    usage.created_at,
    usage.user_id,
    GREATEST(0, CASE WHEN coalesce(usage.billed_input_tokens,0) > 0 THEN usage.billed_input_tokens ELSE coalesce(usage.input_tokens,0) END) AS source_input,
    GREATEST(0, CASE
      WHEN coalesce(usage.billed_tokens,0) > 0 THEN usage.billed_tokens
      ELSE
        CASE WHEN coalesce(usage.billed_input_tokens,0) > 0 THEN usage.billed_input_tokens ELSE coalesce(usage.input_tokens,0) END
        + CASE WHEN coalesce(usage.billed_output_tokens,0) > 0 THEN usage.billed_output_tokens ELSE coalesce(usage.output_tokens,0) END
    END) AS source_billed
  FROM usage_entries usage
  WHERE usage.conversation_id IS NOT NULL AND usage.deleted=false
),
ledger AS (
  SELECT
    conversation_id,
    created_at,
    user_id,
    (FLOOR(source_billed / 100.0) * 100)::int AS billed_tokens,
    LEAST(
      (FLOOR(source_billed / 100.0) * 100)::int,
      (FLOOR(source_input / 100.0) * 100)::int
    ) AS input_tokens
  FROM aligned
),
assistant_map AS (
  SELECT
    (ledger.billed_tokens - ledger.input_tokens) AS token_count,
    (
      SELECT message.id
      FROM messages message
      JOIN conversations conversation ON conversation.id=message.conversation_id
      WHERE message.conversation_id=ledger.conversation_id
        AND conversation.user_id=ledger.user_id
        AND message.role='assistant'
        AND message.created_at>=ledger.created_at - interval '2 seconds'
      ORDER BY message.created_at, message.id
      LIMIT 1
    ) AS message_id
  FROM ledger
  WHERE ledger.billed_tokens > 0
)
UPDATE messages message
SET token_count=assistant_map.token_count
FROM assistant_map
WHERE message.id=assistant_map.message_id;
