CREATE SEQUENCE IF NOT EXISTS support_request_public_id_seq START WITH 23000;

ALTER TABLE support_requests
  ADD COLUMN IF NOT EXISTS public_id text,
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz;

UPDATE support_requests
SET public_id = lpad(nextval('support_request_public_id_seq')::text, 6, '0')
WHERE public_id IS NULL;

ALTER TABLE support_requests
  ALTER COLUMN public_id SET DEFAULT lpad(nextval('support_request_public_id_seq')::text, 6, '0'),
  ALTER COLUMN public_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS support_requests_public_id_idx
  ON support_requests(public_id);

CREATE TABLE IF NOT EXISTS support_request_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  support_request_id uuid NOT NULL REFERENCES support_requests(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  author_type text NOT NULL CHECK (author_type IN ('client', 'agent', 'administrator')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_request_messages_request_created_idx
  ON support_request_messages(support_request_id, created_at);

INSERT INTO support_request_messages(support_request_id, direction, author_type, content, created_at)
SELECT request.id, 'inbound', 'client', request.message, request.created_at
FROM support_requests request
WHERE NOT EXISTS (
  SELECT 1 FROM support_request_messages message
  WHERE message.support_request_id = request.id AND message.direction = 'inbound'
);

INSERT INTO support_request_messages(support_request_id, direction, author_type, content, created_at)
SELECT request.id, 'outbound', 'agent', request.sent_reply, COALESCE(request.replied_at, request.created_at)
FROM support_requests request
WHERE request.sent_reply IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM support_request_messages message
    WHERE message.support_request_id = request.id AND message.direction = 'outbound'
  );

UPDATE support_requests
SET status = CASE WHEN sent_reply IS NOT NULL OR replied_at IS NOT NULL THEN 'in_progress' ELSE 'new' END;
