WITH exact_usage_matches AS (
  SELECT
    message.id AS message_id,
    usage.model_id,
    abs(extract(epoch FROM message.created_at - usage.created_at)) AS seconds_apart
  FROM messages message
  JOIN usage_entries usage
    ON usage.conversation_id = message.conversation_id
    AND usage.deleted = false
    AND usage.model_id IS NOT NULL
    AND usage.model_id <> ''
    AND usage.billed_tokens = message.token_count
  WHERE message.role = 'assistant'
    AND message.model_id IS NULL
    AND coalesce(message.token_count, 0) > 0
),
unambiguous_matches AS (
  SELECT
    message_id,
    (array_agg(model_id ORDER BY seconds_apart, model_id))[1] AS model_id
  FROM exact_usage_matches
  GROUP BY message_id
  HAVING count(DISTINCT model_id) = 1
)
UPDATE messages message
SET model_id = matched.model_id
FROM unambiguous_matches matched
WHERE message.id = matched.message_id
  AND message.model_id IS NULL;
