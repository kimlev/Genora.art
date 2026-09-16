import "server-only";

import { extractHeadings } from "@/lib/blog/markdown-html";
import { isLocale, type Locale } from "@/lib/i18n";
import { query } from "@/lib/server/db";
import type { BlogoroFaq, BlogoroLink, BlogoroOpenGraph } from "@/lib/server/blogoro-publish";
import type { BlogPost } from "./posts";

type ArticleRow = {
  slug: string;
  title: string;
  h1: string;
  meta_description: string;
  canonical_url: string;
  robots: string;
  language: string;
  keywords: string[];
  body_markdown: string | null;
  body_html: string | null;
  faq: BlogoroFaq[];
  internal_links: BlogoroLink[];
  open_graph: BlogoroOpenGraph;
  json_ld: unknown[];
  cover_url: string | null;
  cover_alt: string | null;
  reading_minutes: number;
  published_at: Date | string;
};

function toLocale(value: string): Locale {
  const code = value.toLowerCase().slice(0, 2);
  return isLocale(code) ? code : "ru";
}

function publishedDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
}

function toPost(row: ArticleRow, full: boolean): BlogPost {
  const headings = full ? extractHeadings(row.body_markdown ?? "") : [];
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.meta_description,
    image: row.cover_url || "/blog/ai-agents.svg",
    language: toLocale(row.language),
    topic: row.keywords[0] || "Статья",
    tags: row.keywords,
    publishedAt: publishedDate(row.published_at),
    readingMinutes: row.reading_minutes,
    content: [],
    sections: headings.map((heading) => ({ id: heading.id, title: heading.title, paragraphs: [] })),
    source: "blogoro",
    h1: row.h1,
    canonicalUrl: row.canonical_url,
    robots: row.robots,
    bodyMarkdown: full ? row.body_markdown ?? "" : undefined,
    bodyHtml: full ? row.body_html ?? "" : undefined,
    faq: row.faq ?? [],
    internalLinks: row.internal_links ?? [],
    openGraph: {
      title: row.open_graph?.title || row.title,
      description: row.open_graph?.description || row.meta_description,
      type: row.open_graph?.type || "article",
    },
    jsonLd: row.json_ld ?? [],
    coverAlt: row.cover_alt || row.title,
    pageLanguage: row.language,
  };
}

export async function listPublishedPosts(): Promise<BlogPost[]> {
  try {
    const rows = await query<ArticleRow>(
      `SELECT slug, title, h1, meta_description, canonical_url, robots, language, keywords,
              NULL::text AS body_markdown, NULL::text AS body_html, faq, internal_links, open_graph, json_ld,
              cover_url, cover_alt, reading_minutes, published_at
       FROM blogoro_articles
       ORDER BY published_at DESC`,
    );
    return rows.map((row) => toPost(row, false));
  } catch {
    return [];
  }
}

export async function getPublishedPost(slug: string): Promise<BlogPost | undefined> {
  try {
    const rows = await query<ArticleRow>(
      `SELECT slug, title, h1, meta_description, canonical_url, robots, language, keywords,
              body_markdown, body_html, faq, internal_links, open_graph, json_ld,
              cover_url, cover_alt, reading_minutes, published_at
       FROM blogoro_articles
       WHERE slug=$1`,
      [slug],
    );
    return rows[0] ? toPost(rows[0], true) : undefined;
  } catch {
    return undefined;
  }
}
