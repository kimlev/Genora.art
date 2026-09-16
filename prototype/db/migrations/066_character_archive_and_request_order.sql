ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE characters
  DROP CONSTRAINT IF EXISTS characters_name_check;

ALTER TABLE characters
  DROP CONSTRAINT IF EXISTS characters_name_length_check;

ALTER TABLE characters
  ADD CONSTRAINT characters_name_length_check
  CHECK (char_length(trim(name)) BETWEEN 3 AND 25) NOT VALID;

CREATE INDEX IF NOT EXISTS characters_user_deleted_created_idx
  ON characters(user_id, deleted_at, created_at DESC);

UPDATE image_generations generation
   SET created_at=job.created_at
  FROM generation_jobs job
 WHERE job.user_id=generation.user_id
   AND job.kind='image'
   AND job.result->'generation'->>'requestId'=generation.request_id
   AND job.created_at < generation.created_at;

UPDATE video_generations generation
   SET created_at=job.created_at
  FROM video_jobs job
 WHERE job.user_id=generation.user_id
   AND job.integrator_request_id=generation.request_id
   AND job.created_at < generation.created_at;
