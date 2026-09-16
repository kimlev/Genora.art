CREATE TABLE generation_reservations (
  job_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tokens bigint NOT NULL CHECK (tokens > 0),
  paid_tokens bigint NOT NULL CHECK (paid_tokens >= 0 AND paid_tokens <= tokens),
  status text NOT NULL DEFAULT 'held' CHECK (status IN ('held','captured','refunded')),
  transaction_id uuid NOT NULL REFERENCES balance_transactions(id),
  dispatched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX generation_reservations_open_idx ON generation_reservations(user_id) WHERE status='held';
