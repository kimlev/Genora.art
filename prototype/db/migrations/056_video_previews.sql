UPDATE media_assets
SET preview_byte_length = NULL
WHERE kind = 'video'
  AND preview_bytes IS NULL
  AND preview_byte_length = 0;
