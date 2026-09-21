import "server-only";

import { markdownToHtml } from "@/lib/blog/markdown-html";
import { isServedLocale, type Locale } from "@/lib/i18n";
import { localizeHref, splitLocalePath } from "@/lib/i18n/locale-path";
import { localizeArticleHref } from "@/lib/content/seo-article-links";
import { publicPageMetadata } from "@/lib/seo";
import { SITE_ORIGIN } from "@/lib/site-env";
import { placeArticleGraphics } from "@/lib/server/blogoro-graphics";
import { BlogoroPublishError, mediaPublicUrl, type BlogoroArticleInput } from "@/lib/server/blogoro-publish";
import { query, withTransaction } from "@/lib/server/db";
import { randomBytes } from "node:crypto";
import type { Metadata } from "next";
import { cache } from "react";

export const BLOGORO_PAGE_SECTION_CAPABILITY = "page_section_v1";
export const BLOGORO_PAGE_SECTION_EVENT = "article.page_section.publish";
export const BLOGORO_SEO_SLOT = "seo-article";

const PAGE_ARTICLES = {
  "/agents": "agents",
  "/image-examples": "images",
  "/models": "models",
  "/pricing": "pricing",
  "/rating": "rating",
  "/songs": "songs",
  "/video-examples": "videos",
} as const;

const CURATED_RUSSIAN_PAGE_PATHS = new Set<BlogoroPagePath>([
  "/image-examples",
  "/models",
  "/video-examples",
]);

const REVISION_PATTERN = /^[a-f0-9]{64}$/;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export type BlogoroPagePath = keyof typeof PAGE_ARTICLES;

type BlogoroProjectInput = {
  id?: number;
  name?: string;
  url?: string;
};

type BlogoroPagePublicationInput = {
  type?: string;
  targetUrl?: string;
  slotId?: string;
  revision?: string;
};

export type BlogoroPageSectionPayload = {
  event?: string;
  project?: BlogoroProjectInput;
  article?: BlogoroArticleInput & { updatedAt?: string; technical?: unknown };
  publication?: BlogoroPagePublicationInput;
};

export type BlogoroPageSectionReceipt = {
  url: string;
  slotId: typeof BLOGORO_SEO_SLOT;
  articleId: number;
  revision: string;
};

export type StoredBlogoroPageSection = {
  pagePath: BlogoroPagePath;
  locale: Locale;
  articleId: number;
  revision: string;
  title: string;
  h1: string;
  metaDescription: string;
  canonicalUrl: string;
  language: string;
  bodyHtml: string;
  faq: Array<{ question: string; answer: string }>;
  openGraph: { title?: string; description?: string; type?: string };
  coverUrl: string | null;
  coverAlt: string | null;
};

type SlotRow = {
  project_id: string;
  article_id: string;
  revision: string;
  idempotency_key: string;
  source_updated_at: Date | null;
};

type StoredRow = {
  page_path: BlogoroPagePath;
  locale: Locale;
  article_id: string;
  revision: string;
  title: string;
  h1: string;
  meta_description: string;
  canonical_url: string;
  language: string;
  body_html: string;
  faq: Array<{ question: string; answer: string }> | null;
  open_graph: { title?: string; description?: string; type?: string } | null;
  cover_url: string | null;
  cover_alt: string | null;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asTimestamp(value: unknown): Date | null {
  const text = asString(value);
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) throw new BlogoroPublishError("Некорректная дата версии статьи", 422);
  return date;
}

function decodeImage(base64: string, mime: string): { bytes: Buffer; mime: string } {
  if (!ALLOWED_MIME.has(mime)) throw new BlogoroPublishError("Неподдерживаемый тип изображения", 422);
  const bytes = Buffer.from(base64.replace(/^data:[^;]+;base64,/, ""), "base64");
  if (!bytes.length) throw new BlogoroPublishError("Пустое изображение", 422);
  if (bytes.length > MAX_IMAGE_BYTES) throw new BlogoroPublishError("Изображение слишком большое", 413);
  return { bytes, mime };
}

function normalizeLanguage(value: unknown): string {
  return asString(value).toLowerCase().split(/[-_]/)[0] ?? "";
}

function localizeSectionMarkdown(markdown: string, locale: Locale): string {
  return markdown.replace(/(!?\[[^\]]*\]\()([^)\s]+)(\))/g, (_full, prefix: string, href: string, suffix: string) => {
    const absoluteLocalized = localizeArticleHref(href, locale);
    const localized = absoluteLocalized.startsWith("/") ? localizeHref(absoluteLocalized, locale) : absoluteLocalized;
    return `${prefix}${localized}${suffix}`;
  });
}

/** Убирает повтор заголовка статьи и опускает внутренние заголовки под заголовок страницы. */
function articleBodyMarkdown(markdown: string, h1: string): string {
  const normalizedTitle = (value: string) => value.replace(/[*_`]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
  let body = markdown.replace(/\r\n?/g, "\n").trim();
  const leading = /^#\s+(.+?)(?:\n+|$)/.exec(body);
  if (leading && normalizedTitle(h1) === normalizedTitle(leading[1])) {
    body = body.slice(leading[0].length);
  }
  return body.replace(/^(#{1,5})\s+/gm, (_match, hashes: string) => `${"#".repeat(Math.max(3, hashes.length + 1))} `);
}

export function validateBlogoroPageSectionTarget(payload: BlogoroPageSectionPayload, idempotencyKey: string) {
  if (payload.event !== BLOGORO_PAGE_SECTION_EVENT) throw new BlogoroPublishError("Неизвестное событие", 422);
  const project = payload.project;
  const article = payload.article;
  const publication = payload.publication;
  if (!project || !Number.isSafeInteger(project.id) || Number(project.id) <= 0) {
    throw new BlogoroPublishError("Некорректный проект", 422);
  }
  if (!article || !Number.isSafeInteger(article.id) || Number(article.id) <= 0 || !asString(article.body)) {
    throw new BlogoroPublishError("Нужны идентификатор и текст статьи", 422);
  }
  if (publication?.type !== "page_section" || publication.slotId !== BLOGORO_SEO_SLOT || !REVISION_PATTERN.test(asString(publication.revision))) {
    throw new BlogoroPublishError("Некорректный блок или версия статьи", 422);
  }

  const rawUrl = asString(publication.targetUrl);
  let url: URL;
  let projectUrl: URL;
  try {
    url = new URL(rawUrl);
    projectUrl = new URL(asString(project.url));
  } catch {
    throw new BlogoroPublishError("Некорректный адрес страницы", 422);
  }
  if (url.protocol !== "https:" || url.origin !== SITE_ORIGIN || projectUrl.origin !== url.origin
    || url.username || url.password || url.hash || url.port || url.search || url.toString() !== rawUrl
    || asString(article.canonicalUrl) !== rawUrl) {
    throw new BlogoroPublishError("Адрес должен точно указывать на разрешённую страницу сайта", 422);
  }

  const localized = splitLocalePath(url.pathname);
  if (!localized.locale || !isServedLocale(localized.locale) || !(localized.path in PAGE_ARTICLES)) {
    throw new BlogoroPublishError("На этой странице нет блока для SEO-статьи", 422);
  }
  const pagePath = localized.path as BlogoroPagePath;
  const locale = localized.locale;
  if (normalizeLanguage(article.language) !== locale) {
    throw new BlogoroPublishError("Язык статьи не совпадает с языком страницы", 422);
  }
  if (locale === "ru" && CURATED_RUSSIAN_PAGE_PATHS.has(pagePath)) {
    throw new BlogoroPublishError("Русский SEO-блок уже занят редакционной статьёй", 409);
  }

  const revision = asString(publication.revision);
  const expectedKey = `${project.id}:${article.id}:${revision}`;
  if (idempotencyKey !== expectedKey) throw new BlogoroPublishError("Некорректный ключ доставки", 422);
  return { project, article, pagePath, locale, revision, targetUrl: rawUrl, expectedKey };
}

export async function publishBlogoroPageSection(
  payload: BlogoroPageSectionPayload,
  idempotencyKey: string,
): Promise<{ receipt: BlogoroPageSectionReceipt; pagePath: BlogoroPagePath; locale: Locale }> {
  const target = validateBlogoroPageSectionTarget(payload, idempotencyKey);
  const { project, article, pagePath, locale, revision, targetUrl, expectedKey } = target;
  const projectId = Number(project.id);
  const articleId = Number(article.id);
  const title = asString(article.title);
  const h1 = asString(article.h1) || title;
  const sourceBody = asString(article.body);
  if (!title || !h1) throw new BlogoroPublishError("Нужны title и h1", 422);

  const receipt: BlogoroPageSectionReceipt = { url: targetUrl, slotId: BLOGORO_SEO_SLOT, articleId, revision };
  const sourceUpdatedAt = asTimestamp(article.updatedAt);
  const keywords = (article.keywords ?? []).map(asString).filter(Boolean);
  const faq = (article.faq ?? [])
    .filter((item) => asString(item.question) && asString(item.answer))
    .map((item) => ({ question: asString(item.question), answer: asString(item.answer) }));
  const internalLinks = (article.internalLinks ?? [])
    .filter((item) => asString(item.anchor) && asString(item.url))
    .map((item) => ({ anchor: asString(item.anchor), url: asString(item.url) }));
  const openGraph = {
    title: asString(article.openGraph?.title) || title,
    description: asString(article.openGraph?.description) || asString(article.metaDescription),
    type: "article",
  };

  await withTransaction(async (client) => {
    const lockKey = `${pagePath}:${locale}:${BLOGORO_SEO_SLOT}`;
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [lockKey]);
    const currentResult = await client.query<SlotRow>(
      `SELECT project_id, article_id, revision, idempotency_key, source_updated_at
       FROM blogoro_page_sections
       WHERE page_path=$1 AND locale=$2 AND slot_id=$3
       FOR UPDATE`,
      [pagePath, locale, BLOGORO_SEO_SLOT],
    );
    const current = currentResult.rows[0];
    if (current) {
      if (Number(current.project_id) !== projectId || Number(current.article_id) !== articleId) {
        throw new BlogoroPublishError("SEO-блок принадлежит другой статье", 409);
      }
      if (current.revision === revision && current.idempotency_key === expectedKey) return;
      if (current.source_updated_at && sourceUpdatedAt && sourceUpdatedAt.getTime() < current.source_updated_at.getTime()) {
        throw new BlogoroPublishError("Нельзя заменить SEO-блок более старой версией", 409);
      }
    }

    const initialBody = markdownToHtml(articleBodyMarkdown(localizeSectionMarkdown(sourceBody, locale), h1));
    await client.query(
      `INSERT INTO blogoro_page_sections(
         page_path, locale, slot_id, project_id, article_id, revision, idempotency_key, source_updated_at,
         title, h1, meta_description, canonical_url, robots, language, keywords, body_markdown, body_html,
         faq, internal_links, open_graph, json_ld, reading_minutes, word_count, technical
       ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb,$19::jsonb,$20::jsonb,$21::jsonb,$22,$23,$24::jsonb)
       ON CONFLICT (page_path, locale, slot_id) DO UPDATE SET
         revision=excluded.revision, idempotency_key=excluded.idempotency_key, source_updated_at=excluded.source_updated_at,
         title=excluded.title, h1=excluded.h1, meta_description=excluded.meta_description,
         canonical_url=excluded.canonical_url, robots=excluded.robots, language=excluded.language,
         keywords=excluded.keywords, body_markdown=excluded.body_markdown, body_html=excluded.body_html,
         faq=excluded.faq, internal_links=excluded.internal_links, open_graph=excluded.open_graph,
         json_ld=excluded.json_ld, reading_minutes=excluded.reading_minutes, word_count=excluded.word_count,
         technical=excluded.technical, cover_url=NULL, cover_alt=NULL, updated_at=now()`,
      [
        pagePath, locale, BLOGORO_SEO_SLOT, projectId, articleId, revision, expectedKey, sourceUpdatedAt,
        title, h1, asString(article.metaDescription), targetUrl, asString(article.robots) || "index,follow",
        asString(article.language), keywords, sourceBody, initialBody, JSON.stringify(faq), JSON.stringify(internalLinks),
        JSON.stringify(openGraph), JSON.stringify(Array.isArray(article.jsonLd) ? article.jsonLd : []),
        article.readingTimeMinutes ?? 1, article.wordCount ?? sourceBody.split(/\s+/).filter(Boolean).length,
        JSON.stringify(article.technical && typeof article.technical === "object" ? article.technical : {}),
      ],
    );
    await client.query(
      "DELETE FROM blogoro_page_section_media WHERE page_path=$1 AND locale=$2 AND slot_id=$3",
      [pagePath, locale, BLOGORO_SEO_SLOT],
    );

    let coverUrl: string | null = null;
    let coverAlt = asString(article.coverImage?.alt) || title;
    if (article.coverImage?.dataBase64 && article.coverImage.mime) {
      const image = decodeImage(article.coverImage.dataBase64, article.coverImage.mime);
      const id = randomBytes(16).toString("hex");
      await client.query(
        `INSERT INTO blogoro_page_section_media(id,page_path,locale,slot_id,kind,mime,alt,bytes)
         VALUES($1,$2,$3,$4,'cover',$5,$6,$7)`,
        [id, pagePath, locale, BLOGORO_SEO_SLOT, image.mime, coverAlt, image.bytes],
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
        `INSERT INTO blogoro_page_section_media(id,page_path,locale,slot_id,kind,mime,alt,bytes)
         VALUES($1,$2,$3,$4,'graphic',$5,$6,$7)`,
        [id, pagePath, locale, BLOGORO_SEO_SLOT, image.mime, alt, image.bytes],
      );
      inlineGraphics.push({ url: mediaPublicUrl(id), alt, caption: graphic.caption, placement: graphic.placement });
    }
    if (!coverUrl && inlineGraphics[0]) {
      coverUrl = inlineGraphics[0].url;
      coverAlt = inlineGraphics[0].alt;
    }

    const placedBody = placeArticleGraphics(sourceBody, inlineGraphics, title);
    const localizedBody = localizeSectionMarkdown(placedBody, locale);
    const bodyHtml = markdownToHtml(articleBodyMarkdown(localizedBody, h1));
    await client.query(
      `UPDATE blogoro_page_sections
       SET body_markdown=$4, body_html=$5, cover_url=$6, cover_alt=$7, updated_at=now()
       WHERE page_path=$1 AND locale=$2 AND slot_id=$3`,
      [pagePath, locale, BLOGORO_SEO_SLOT, localizedBody, bodyHtml, coverUrl, coverAlt],
    );
  });

  return { receipt, pagePath, locale };
}

export const getBlogoroPageSection = cache(async function getBlogoroPageSection(
  pagePath: BlogoroPagePath,
  locale: Locale,
): Promise<StoredBlogoroPageSection | null> {
  if (locale === "ru" && CURATED_RUSSIAN_PAGE_PATHS.has(pagePath)) return null;
  const rows = await query<StoredRow>(
    `SELECT page_path, locale, article_id, revision, title, h1, meta_description, canonical_url,
            language, body_html, faq, open_graph, cover_url, cover_alt
     FROM blogoro_page_sections
     WHERE page_path=$1 AND locale=$2 AND slot_id=$3`,
    [pagePath, locale, BLOGORO_SEO_SLOT],
  );
  const row = rows[0];
  if (!row) return null;
  if (normalizeLanguage(row.language) !== locale) return null;
  try {
    if (splitLocalePath(new URL(row.canonical_url).pathname).locale !== locale) return null;
  } catch {
    return null;
  }
  return {
    pagePath: row.page_path,
    locale: row.locale,
    articleId: Number(row.article_id),
    revision: row.revision,
    title: row.title,
    h1: row.h1,
    metaDescription: row.meta_description,
    canonicalUrl: row.canonical_url,
    language: row.language,
    bodyHtml: row.body_html,
    faq: Array.isArray(row.faq) ? row.faq : [],
    openGraph: row.open_graph ?? {},
    coverUrl: row.cover_url,
    coverAlt: row.cover_alt,
  };
});

export async function blogoroPageMetadata(pagePath: BlogoroPagePath, locale: Locale): Promise<Metadata> {
  const base = publicPageMetadata(pagePath, locale);
  const article = await getBlogoroPageSection(pagePath, locale);
  if (!article) return base;
  const title = article.openGraph.title || article.title;
  const description = article.openGraph.description || article.metaDescription;
  return {
    ...base,
    title: { absolute: title },
    description,
    openGraph: {
      ...base.openGraph,
      type: "article",
      title,
      description,
      url: article.canonicalUrl,
      images: article.coverUrl ? [{ url: article.coverUrl, alt: article.coverAlt ?? article.title }] : undefined,
    },
    twitter: {
      ...base.twitter,
      card: "summary_large_image",
      title,
      description,
      images: article.coverUrl ? [article.coverUrl] : undefined,
    },
  };
}
