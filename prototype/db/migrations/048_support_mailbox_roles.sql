ALTER TABLE support_mailboxes
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_auth boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS support_mailboxes_one_primary_idx
  ON support_mailboxes ((true)) WHERE is_primary;

CREATE UNIQUE INDEX IF NOT EXISTS support_mailboxes_one_auth_idx
  ON support_mailboxes ((true)) WHERE is_auth;

UPDATE support_mailboxes SET is_primary = true
WHERE id = (
  SELECT id FROM support_mailboxes
  WHERE NOT EXISTS (SELECT 1 FROM support_mailboxes other WHERE other.is_primary)
  ORDER BY CASE WHEN lower(email) = 'support@genora.art' THEN 0 ELSE 1 END, created_at
  LIMIT 1
);

UPDATE support_mailboxes SET is_auth = true
WHERE id = (
  SELECT id FROM support_mailboxes
  WHERE NOT EXISTS (SELECT 1 FROM support_mailboxes other WHERE other.is_auth)
  ORDER BY CASE WHEN lower(email) = 'support@genora.art' THEN 0 ELSE 1 END, created_at
  LIMIT 1
);
