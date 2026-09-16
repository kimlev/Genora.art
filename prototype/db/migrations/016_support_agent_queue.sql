ALTER TABLE support_requests
  ADD COLUMN IF NOT EXISTS next_agent_reply_at timestamptz,
  ADD COLUMN IF NOT EXISTS agent_reply_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agent_locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_agent_error text,
  ADD COLUMN IF NOT EXISTS requires_human boolean NOT NULL DEFAULT false;

UPDATE support_requests
SET next_agent_reply_at = GREATEST(COALESCE(acknowledged_at, created_at) + interval '10 minutes', now())
WHERE status = 'new'
  AND acknowledged_at IS NOT NULL
  AND replied_at IS NULL
  AND next_agent_reply_at IS NULL;

UPDATE support_requests
SET status = 'requires_human',
    requires_human = true,
    last_agent_error = 'ACKNOWLEDGEMENT_NOT_SENT'
WHERE status = 'new'
  AND acknowledged_at IS NULL
  AND replied_at IS NULL;

CREATE INDEX IF NOT EXISTS support_requests_agent_queue_idx
  ON support_requests(next_agent_reply_at, created_at)
  WHERE status = 'new' AND replied_at IS NULL;
