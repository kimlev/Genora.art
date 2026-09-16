import "server-only";

import { markdownToHtml } from "@/lib/blog/markdown-html";
import type { Locale } from "@/lib/i18n";
import { withLocalePath } from "@/lib/i18n/locale-path";
import { localeFromValue } from "@/lib/seo";
import { query, withTransaction } from "@/lib/server/db";
import { placeArticleGraphics } from "@/lib/server/blogoro-graphics";
import { randomBytes } from "node:crypto";

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,118}[a-z0-9])?$/;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export class BlogoroPublishError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BlogoroPublishError";
    this.status = status;
  }
}

export type BlogoroFaq = { question: string; answer: string };
export type BlogoroLink = { anchor: string; url: string };
export type BlogoroOpenGraph = { title?: string; description?: string; type?: string };

type CoverImage = { dataBase64?: string; mime?: string; alt?: string } | null;
type Graphic = {
  kind?: string;
  sortOrder?: number;
  placement?: string | null;
  caption?: string | null;
  alt?: string;
  imageBase64?: string;
  mime?: string;
};

export type BlogoroArticleInput = {
  id?: number;
  slug?: string;
  title?: string;
  h1?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  robots?: string;
  language?: string | null;
  keywords?: string[];
  body?: string;
  faq?: BlogoroFaq[];
  internalLinks?: BlogoroLink[];
  openGraph?: BlogoroOpenGraph;
  coverImage?: CoverImage;
  graphics?: Graphic[];
  jsonLd?: unknown[];
  readingTimeMinutes?: number;
  wordCount?: number;
  createdAt?: string;
  writtenAt?: string;
  updatedAt?: string;
  technical?: unknown;
};

function siteOrigin(): string {
  const value = process.env.APP_BASE_URL?.trim();
  if (value) {
    try {
      return new URL(value).origin;
    } catch {
      /* use default */
    }
  }
  return "https://genora.art";
}

/** Blogoro присылает язык как «ru» или «ru-RU», а в адресе живёт только код языка */
export function articleLocale(language?: string | null): Locale {
  return localeFromValue(asString(language).toLowerCase().slice(0, 2));
}

/** Адрес статьи на языке её текста: без префикса этот адрес отвечает редиректом */
export function articlePublicUrl(slug: string, language?: string | null): string {
  return `${siteOrigin()}${withLocalePath(`/blog/${slug}`, articleLocale(language))}`;
}

export function blogIndexUrl(locale: Locale): string {
  return `${siteOrigin()}${withLocalePath("/blog", locale)}`;
}

export function mediaPublicUrl(id: string): string {
  return `${siteOrigin()}/blogoro/media/${id}`;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function decodeImage(base64: string, mime: string): { bytes: Buffer; mime: string } {
  if (!ALLOWED_MIME.has(mime)) throw new BlogoroPublishError("Неподдерживаемый тип изображения", 400);
  const bytes = Buffer.from(base64.replace(/^data:[^;]+;base64,/, ""), "base64");
  if (!bytes.length) throw new BlogoroPublishError("Пустое изображение", 400);
  if (bytes.length > MAX_IMAGE_BYTES) throw new BlogoroPublishError("Изображение слишком большое", 413);
  return { bytes, mime };
}

function withCoverImage(jsonLd: unknown[], coverUrl: string | null): unknown[] {
  if (!coverUrl) return jsonLd;
  return jsonLd.map((block) => {
    if (!block || typeof block !== "object" || Array.isArray(block)) return block;
    const type = (block as { "@type"?: string })["@type"];
    if (type === "Article" || type === "BlogPosting") return { ...block, image: coverUrl };
    return block;
  });
}

export function isBlogoroWebhookTest(payload: unknown): boolean {
  return Boolean(payload && typeof payload === "object" && (payload as { event?: unknown }).event === "webhook.test");
}

export function parseBlogoroPayload(payload: unknown): BlogoroArticleInput {
  if (!payload || typeof payload !== "object") throw new BlogoroPublishError("Некорректный пакет", 400);
  const record = payload as { event?: string; article?: BlogoroArticleInput };
  if (record.event && record.event !== "article.publish") {
    throw new BlogoroPublishError("Неизвестное событие", 400);
  }
  const article = record.article;
  if (!article || typeof article !== "object") throw new BlogoroPublishError("В пакете нет article", 400);
  return article;
}

export async function publishBlogoroArticle(
  article: BlogoroArticleInput,
): Promise<{ url: string; slug: string; locale: Locale }> {
  const slug = asString(article.slug).toLowerCase();
  if (!SLUG_PATTERN.test(slug)) throw new BlogoroPublishError("Некорректный slug", 400);
  const title = asString(article.title);
  const h1 = asString(article.h1) || title;
  const body = asString(article.body);
  if (!title || !body) throw new BlogoroPublishError("Нужны title и body", 400);

  const language = asString(article.language) || "ru";
  const keywords = (article.keywords ?? []).map(asString).filter(Boolean);
  const faq = (article.faq ?? []).filter((item) => asString(item.question) && asString(item.answer))
    .map((item) => ({ question: asString(item.question), answer: asString(item.answer) }));
  const internalLinks = (article.internalLinks ?? []).filter((item) => asString(item.anchor) && asString(item.url))
    .map((item) => ({ anchor: asString(item.anchor), url: asString(item.url) }));
  const locale = articleLocale(language);
  const pageUrl = articlePublicUrl(slug, language);
  const canonicalUrl = pageUrl;
  const robots = asString(article.robots) || "index,follow";
  const openGraph = {
    title: asString(article.openGraph?.title) || title,
    description: asString(article.openGraph?.description) || asString(article.metaDescription),
    type: asString(article.openGraph?.type) || "article",
  };

  return withTransaction(async (client) => {
    await client.query(
      `INSERT INTO blogoro_articles(slug, title, h1, meta_description, canonical_url, robots, language, keywords, body_markdown, body_html)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,'','')
       ON CONFLICT (slug) DO UPDATE SET title=excluded.title, updated_at=now()`,
      [slug, title, h1, asString(article.metaDescription), canonicalUrl, robots, language, keywords],
    );
    await client.query("DELETE FROM blogoro_media WHERE slug=$1", [slug]);

    let coverUrl: string | null = null;
    let coverAlt = asString(article.coverImage?.alt) || title;
    if (article.coverImage?.dataBase64 && article.coverImage.mime) {
      const image = decodeImage(article.coverImage.dataBase64, article.coverImage.mime);
      const id = randomBytes(16).toString("hex");
      await client.query(
        "INSERT INTO blogoro_media(id, slug, kind, mime, alt, bytes) VALUES($1,$2,'cover',$3,$4,$5)",
        [id, slug, image.mime, coverAlt, image.bytes],
      );
      coverUrl = mediaPublicUrl(id);
    }

    const inlineGraphics: Array<{ url: string; alt: string; caption?: string | null; placement?: string | null }> = [];
    const graphics = [...(article.graphics ?? [])]
      .filter((item) => item.kind !== "cover" && item.kind !== "thumbnail")
      .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
    for (const graphic of graphics) {
      if (!graphic.imageBase64 || !graphic.mime) continue;
      const image = decodeImage(graphic.imageBase64, graphic.mime);
      const id = randomBytes(16).toString("hex");
      const alt = asString(graphic.alt) || title;
      await client.query(
        "INSERT INTO blogoro_media(id, slug, kind, mime, alt, bytes) VALUES($1,$2,'graphic',$3,$4,$5)",
        [id, slug, image.mime, alt, image.bytes],
      );
      inlineGraphics.push({
        url: mediaPublicUrl(id),
        alt,
        caption: graphic.caption,
        placement: graphic.placement,
      });
    }

    if (!coverUrl && inlineGraphics[0]) {
      coverUrl = inlineGraphics[0].url;
      coverAlt = inlineGraphics[0].alt;
    }

    const bodyMarkdown = placeArticleGraphics(body, inlineGraphics, title);
    const bodyHtml = markdownToHtml(bodyMarkdown);
    const jsonLd = withCoverImage(Array.isArray(article.jsonLd) ? article.jsonLd : [], coverUrl);
    const wordCount = article.wordCount ?? bodyMarkdown.split(/\s+/).filter(Boolean).length;
    const readingMinutes = article.readingTimeMinutes ?? Math.max(1, Math.ceil(wordCount / 200));
    const publishedAt = article.writtenAt || article.createdAt || new Date().toISOString();

    await client.query(
      `UPDATE blogoro_articles SET
        title=$2, h1=$3, meta_description=$4, canonical_url=$5, robots=$6, language=$7, keywords=$8,
        body_markdown=$9, body_html=$10, faq=$11::jsonb, internal_links=$12::jsonb, open_graph=$13::jsonb,
        json_ld=$14::jsonb, cover_url=$15, cover_alt=$16, reading_minutes=$17, word_count=$18,
        source_article_id=$19, published_at=$20, updated_at=now()
       WHERE slug=$1`,
      [
        slug, title, h1, asString(article.metaDescription), canonicalUrl, robots, language, keywords,
        bodyMarkdown, bodyHtml, JSON.stringify(faq), JSON.stringify(internalLinks), JSON.stringify(openGraph),
        JSON.stringify(jsonLd), coverUrl, coverAlt, readingMinutes, wordCount,
        article.id ?? null, publishedAt,
      ],
    );

    return { url: pageUrl, slug, locale };
  });
}

export async function getBlogoroMedia(id: string): Promise<{ bytes: Buffer; mime: string } | null> {
  if (!/^[a-f0-9]{32}$/.test(id)) return null;
  const rows = await query<{ bytes: Buffer; mime: string }>(
    `SELECT bytes, mime FROM blogoro_media WHERE id=$1
     UNION ALL
     SELECT bytes, mime FROM blogoro_page_section_media WHERE id=$1
     LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}
