ALTER TABLE blogoro_page_sections
  DROP CONSTRAINT IF EXISTS blogoro_page_sections_page_path_check;

ALTER TABLE blogoro_page_sections
  ADD CONSTRAINT blogoro_page_sections_page_path_check
  CHECK (page_path IN (
    '/agents',
    '/image-examples',
    '/models',
    '/pricing',
    '/rating',
    '/songs',
    '/video-examples'
  ));
