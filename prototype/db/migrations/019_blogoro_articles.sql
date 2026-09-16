CREATE TABLE IF NOT EXISTS blogoro_articles (
  slug text PRIMARY KEY,
  title text NOT NULL,
  h1 text NOT NULL,
  meta_description text NOT NULL,
  canonical_url text NOT NULL,
  robots text NOT NULL DEFAULT 'index,follow',
  language text NOT NULL DEFAULT 'ru',
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
  source_article_id integer,
  published_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blogoro_articles_published_at_idx
  ON blogoro_articles (published_at DESC);

CREATE TABLE IF NOT EXISTS blogoro_media (
  id text PRIMARY KEY,
  slug text NOT NULL REFERENCES blogoro_articles(slug) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('cover', 'graphic')),
  mime text NOT NULL,
  alt text NOT NULL DEFAULT '',
  bytes bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blogoro_media_slug_idx
  ON blogoro_media (slug);
