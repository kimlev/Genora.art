ALTER TABLE support_requests
  ADD COLUMN IF NOT EXISTS admin_read_at timestamptz;

UPDATE support_requests
SET admin_read_at = COALESCE(replied_at, created_at)
WHERE admin_read_at IS NULL
  AND status <> 'new';
