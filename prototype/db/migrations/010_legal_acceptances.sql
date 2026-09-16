CREATE TABLE IF NOT EXISTS legal_acceptances (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_slug text NOT NULL CHECK (document_slug IN ('terms', 'privacy')),
  document_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  PRIMARY KEY (user_id, document_slug, document_version)
);

CREATE INDEX IF NOT EXISTS legal_acceptances_user_accepted_idx
  ON legal_acceptances(user_id, accepted_at DESC);
