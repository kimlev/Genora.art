CREATE TABLE IF NOT EXISTS support_mailboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  provider text NOT NULL DEFAULT 'privateemail',
  app_password_encrypted text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  last_uid bigint NOT NULL DEFAULT 0,
  uid_validity text,
  last_organized_on date,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS support_mailboxes_email_idx
  ON support_mailboxes (lower(email));

ALTER TABLE support_requests
  ADD COLUMN IF NOT EXISTS inbox_email text;

CREATE INDEX IF NOT EXISTS support_requests_inbox_email_idx
  ON support_requests (lower(inbox_email));
