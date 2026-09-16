CREATE TABLE IF NOT EXISTS blogoro_page_sections (
  page_path text NOT NULL CHECK (page_path IN ('/image-examples', '/video-examples', '/models')),
  locale text NOT NULL,
  slot_id text NOT NULL DEFAULT 'seo-article' CHECK (slot_id = 'seo-article'),
  project_id bigint NOT NULL,
  article_id bigint NOT NULL,
  revision text NOT NULL CHECK (revision ~ '^[a-f0-9]{64}$'),
  idempotency_key text NOT NULL UNIQUE,
  source_updated_at timestamptz,
  title text NOT NULL,
  h1 text NOT NULL,
  meta_description text NOT NULL DEFAULT '',
  canonical_url text NOT NULL,
  robots text NOT NULL DEFAULT 'index,follow',
  language text NOT NULL,
  keywords text[] NOT NULL DEFAULT '{}',
  body_markdown text NOT NULL,
  body_html text NOT NULL,
  faq jsonb NOT NULL DEFAULT '[]'::jsonb,
  internal_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  open_graph jsonb NOT NULL DEFAULT '{}'::jsonb,
  json_ld jsonb NOT NULL DEFAULT '[]'::jsonb,
  cover_url text,
  cover_alt text,
  reading_minutes integer NOT NULL DEFAULT 1,
  word_count integer NOT NULL DEFAULT 0,
  technical jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (page_path, locale, slot_id)
);

CREATE INDEX IF NOT EXISTS blogoro_page_sections_article_idx
  ON blogoro_page_sections (project_id, article_id);

CREATE TABLE IF NOT EXISTS blogoro_page_section_media (
  id text PRIMARY KEY,
  page_path text NOT NULL,
  locale text NOT NULL,
  slot_id text NOT NULL DEFAULT 'seo-article',
  kind text NOT NULL CHECK (kind IN ('cover', 'graphic')),
  mime text NOT NULL,
  alt text NOT NULL DEFAULT '',
  bytes bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (page_path, locale, slot_id)
    REFERENCES blogoro_page_sections(page_path, locale, slot_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS blogoro_page_section_media_slot_idx
  ON blogoro_page_section_media (page_path, locale, slot_id);
