import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  BLOGORO_PAGE_SECTION_CAPABILITY,
  extractFaqSection,
  validateBlogoroPageSectionTarget,
} from "../src/lib/server/blogoro-page-sections.ts";

const revision = "a".repeat(64);

function payload(overrides = {}) {
  return {
    event: "article.page_section.publish",
    project: { id: 7, name: "Genora.art", url: "https://genora.art" },
    article: {
      id: 42,
      title: "English article",
      h1: "English article",
      body: "## Useful section\n\nComplete article body.",
      canonicalUrl: "https://genora.art/en/models",
      language: "en-US",
    },
    publication: {
      type: "page_section",
      targetUrl: "https://genora.art/en/models",
      slotId: "seo-article",
      revision,
    },
    ...overrides,
  };
}

test("accepts a signed-delivery target only for an allowed localized SEO slot", () => {
  const result = validateBlogoroPageSectionTarget(payload(), `7:42:${revision}`);
  assert.equal(result.pagePath, "/models");
  assert.equal(result.locale, "en");
  assert.equal(BLOGORO_PAGE_SECTION_CAPABILITY, "page_section_v1");
});

test("protects curated Russian articles from automatic replacement", () => {
  const targetUrl = "https://genora.art/ru/models";
  assert.throws(
    () => validateBlogoroPageSectionTarget(payload({
      article: { ...payload().article, language: "ru", canonicalUrl: targetUrl },
      publication: { ...payload().publication, targetUrl },
    }), `7:42:${revision}`),
    (error) => error?.status === 409,
  );
});

test("accepts page-section articles for the additional pages, including Russian", () => {
  for (const pagePath of ["pricing", "rating", "agents", "songs"]) {
    for (const locale of ["en", "ru"]) {
      const targetUrl = `https://genora.art/${locale}/${pagePath}`;
      const result = validateBlogoroPageSectionTarget(payload({
        article: { ...payload().article, language: locale, canonicalUrl: targetUrl },
        publication: { ...payload().publication, targetUrl },
      }), `7:42:${revision}`);
      assert.equal(result.pagePath, `/${pagePath}`);
      assert.equal(result.locale, locale);
    }
  }
});

test("rejects unknown pages, mismatched languages and delivery keys", () => {
  const unknownUrl = "https://genora.art/en/not-an-article-page";
  assert.throws(
    () => validateBlogoroPageSectionTarget(payload({
      article: { ...payload().article, canonicalUrl: unknownUrl },
      publication: { ...payload().publication, targetUrl: unknownUrl },
    }), `7:42:${revision}`),
    (error) => error?.status === 422,
  );
  assert.throws(
    () => validateBlogoroPageSectionTarget(payload({ article: { ...payload().article, language: "de" } }), `7:42:${revision}`),
    (error) => error?.status === 422,
  );
  assert.throws(
    () => validateBlogoroPageSectionTarget(payload(), "wrong-key"),
    (error) => error?.status === 422,
  );
});

test("extracts a markdown FAQ block for accordion rendering without leaving duplicate body text", () => {
  const markdown = [
    "## Article content",
    "\nSome useful text.",
    "\n## FAQ",
    "\n**What is an AI video generator?**",
    "\nIt creates videos from prompts.",
    "\n**Can I use it commercially?**",
    "\nCheck the selected model's license.",
  ].join("\n");
  const result = extractFaqSection(markdown);

  assert.equal(result.body, "## Article content\n\nSome useful text.");
  assert.deepEqual(result.faq, [
    { question: "What is an AI video generator?", answer: "It creates videos from prompts." },
    { question: "Can I use it commercially?", answer: "Check the selected model's license." },
  ]);
});

test("extracts heading-form FAQ questions used by recent Blogoro publications", () => {
  const markdown = [
    "Intro text.",
    "\n## FAQ",
    "\n### Was ist der wichtigste Vorteil eines KI-Aggregators?",
    "\nMehrere Modelle und Aufgabenbereiche werden in einer einzigen Oberfläche gebündelt.",
    "\n### Wie kann ich ein passendes KI-Modell finden?",
    "\nDie Auswahl sollte von der konkreten Aufgabe ausgehen.",
  ].join("\n");
  const result = extractFaqSection(markdown);

  assert.equal(result.body, "Intro text.");
  assert.deepEqual(result.faq, [
    {
      question: "Was ist der wichtigste Vorteil eines KI-Aggregators?",
      answer: "Mehrere Modelle und Aufgabenbereiche werden in einer einzigen Oberfläche gebündelt.",
    },
    {
      question: "Wie kann ich ein passendes KI-Modell finden?",
      answer: "Die Auswahl sollte von der konkreten Aufgabe ausgehen.",
    },
  ]);
});

test("receiver advertises the capability, renders verification attributes and submits page sections for indexing", () => {
  const root = path.resolve(import.meta.dirname, "..");
  const route = readFileSync(path.join(root, "src/app/blogoro/publish/route.ts"), "utf8");
  const component = readFileSync(path.join(root, "src/components/catalog/blogoro-seo-article-slot.tsx"), "utf8");
  const migration = readFileSync(path.join(root, "db/migrations/060_blogoro_page_sections.sql"), "utf8");
  const pageBranch = route.slice(route.indexOf("payload.event === BLOGORO_PAGE_SECTION_EVENT"), route.indexOf("const published = await publishBlogoroArticle"));

  assert.match(route, /capabilities: \[BLOGORO_PAGE_SECTION_CAPABILITY\]/);
  assert.match(pageBranch, /submitPageForIndexing\(published\.receipt\.url, published\.locale\)/);
  assert.match(pageBranch, /IS_STAGING/);
  assert.match(pageBranch, /revalidatePath\("\/sitemap\.xml"\)/);
  assert.match(component, /data-blogoro-slot=\{BLOGORO_SEO_SLOT\}/);
  assert.match(component, /data-blogoro-article-id=\{published\.articleId\}/);
  assert.match(component, /data-blogoro-revision=\{published\.revision\}/);
  assert.match(migration, /PRIMARY KEY \(page_path, locale, slot_id\)/);
  assert.match(migration, /idempotency_key text NOT NULL UNIQUE/);
});

test("all seven pages render the server SEO slot instead of old placeholder articles", () => {
  const root = path.resolve(import.meta.dirname, "..");
  const pages = [
    "src/app/[locale]/models/page.tsx",
    "src/app/[locale]/(media-templates)/image-examples/page.tsx",
    "src/app/[locale]/(media-templates)/video-examples/page.tsx",
    "src/app/[locale]/pricing/page.tsx",
    "src/app/[locale]/rating/page.tsx",
    "src/app/[locale]/agents/page.tsx",
    "src/app/[locale]/songs/page.tsx",
  ].map((file) => readFileSync(path.join(root, file), "utf8"));
  const gallery = readFileSync(path.join(root, "src/components/catalog/studio-gallery-page.tsx"), "utf8");
  const slot = readFileSync(path.join(root, "src/components/catalog/blogoro-seo-article-slot.tsx"), "utf8");
  const placeholder = readFileSync(path.join(root, "src/components/catalog/seo-article-placeholder.tsx"), "utf8");
  const oldClients = [
    "src/components/pricing/pricing-page-content.tsx",
    "src/components/rating/rating-page-content.tsx",
    "src/components/agents/agents-page-content.tsx",
  ].map((file) => readFileSync(path.join(root, file), "utf8"));
  const songsPage = pages.at(-1);
  const musicPage = readFileSync(path.join(root, "src/components/music/music-public-page.tsx"), "utf8");

  for (const page of pages) assert.match(page, /<BlogoroSeoArticleSlot/);
  for (const client of oldClients) assert.doesNotMatch(client, /<SeoArticle/);
  assert.match(musicPage, /<MusicGuideSections \/>/);
  assert.ok(songsPage.indexOf("<MusicPublicPage />") < songsPage.indexOf("<BlogoroSeoArticleSlot"));
  assert.ok(songsPage.indexOf("<BlogoroSeoArticleSlot") < songsPage.indexOf("<MusicGuideCta />"));
  assert.match(placeholder, /data-blogoro-placeholder="true"/);
  assert.match(placeholder, /СЕО статья/);
  assert.match(placeholder, /Artículo SEO/);
  assert.doesNotMatch(slot, /if \(IS_STAGING\) return <SeoArticlePlaceholder/);
  assert.match(slot, /getBlogoroPageSection\(pagePath, locale\)/);
  assert.doesNotMatch(slot, /<SeoArticle articleId=/);
  assert.doesNotMatch(gallery, /<SeoArticle|history\.pushState/);
  assert.match(gallery, /router\.push\(hrefForTab\(next\)\)/);
});
