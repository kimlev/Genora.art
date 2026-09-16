ALTER TABLE support_requests
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'web_form',
  ADD COLUMN IF NOT EXISTS locale text,
  ADD COLUMN IF NOT EXISTS source_message_id text,
  ADD COLUMN IF NOT EXISTS skip_reply boolean NOT NULL DEFAULT false;

ALTER TABLE support_requests DROP CONSTRAINT IF EXISTS support_requests_channel_check;
ALTER TABLE support_requests
  ADD CONSTRAINT support_requests_channel_check CHECK (channel IN ('web_form', 'email'));

CREATE UNIQUE INDEX IF NOT EXISTS support_requests_source_message_id_idx
  ON support_requests(source_message_id)
  WHERE source_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS support_requests_agent_channel_queue_idx
  ON support_requests(channel, next_agent_reply_at, created_at)
  WHERE status = 'new' AND replied_at IS NULL AND skip_reply = false;

CREATE TABLE IF NOT EXISTS support_sender_folders (
  sender_email text PRIMARY KEY,
  folder_name text NOT NULL,
  folder_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS support_sender_folders_path_idx
  ON support_sender_folders(folder_path);

CREATE TABLE IF NOT EXISTS support_mail_state (
  id integer PRIMARY KEY CHECK (id = 1),
  last_uid bigint NOT NULL DEFAULT 0,
  uid_validity text,
  last_organized_on date,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO support_mail_state(id) VALUES (1) ON CONFLICT DO NOTHING;
