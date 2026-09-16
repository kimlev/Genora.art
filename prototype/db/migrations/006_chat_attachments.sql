ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE balance_transactions
SET note = regexp_replace(note, '\s*[×x]\s*[0-9]+([.,][0-9]+)?\s*$', '')
WHERE kind = 'usage' AND note ~ '\s*[×x]\s*[0-9]+([.,][0-9]+)?\s*$';
