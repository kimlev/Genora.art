import assert from "node:assert/strict";
import test from "node:test";
import { VIDEO_SEO_ARTICLE_RU, VIDEO_SEO_TECH_RU } from "../src/lib/content/video-seo-article-ru.ts";
import { parseSeoMarkdown } from "../src/lib/content/parse-seo-markdown.ts";
import { localizeArticleHref } from "../src/lib/content/seo-article-links.ts";

test("video SEO article has one H1, structured sections, tables and FAQ schema content", () => {
  const article = parseSeoMarkdown(VIDEO_SEO_ARTICLE_RU, "videos");
  assert.equal((VIDEO_SEO_ARTICLE_RU.match(/^# /gm) ?? []).length, 1);
  assert.equal(article.title, VIDEO_SEO_TECH_RU.title);
  assert.ok(article.sections.length >= 8);
  assert.ok(article.sections.some((section) => section.blocks.some((block) => block.type === "table")));
  assert.ok(article.faq.length >= 6);
});

test("video article links resolve to existing localized sections", () => {
  const links = [...VIDEO_SEO_ARTICLE_RU.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map((match) => localizeArticleHref(match[1], "ru"));
  assert.ok(links.includes("/ru/create-foto-video?tab=video"));
  assert.ok(links.includes("/ru/models"));
  assert.ok(links.includes("/ru/agents"));
  assert.ok(links.includes("/ru/pricing"));
  assert.ok(links.includes("/ru/blog"));
  for (const link of links) assert.doesNotMatch(link, /^\/ru\/(video|tools|blog\/prompts|blog\/video-generators|blog\/ai-video-consistency)(?:[?#]|$)/);
});

test("video examples use supplied metadata and a visible article H1", async () => {
  const seo = await import("../src/lib/seo.ts");
  const copy = seo.seoCopy("/video-examples", "ru");
  assert.match(copy.title, new RegExp(VIDEO_SEO_TECH_RU.title.replace(/[?]/g, "\\?")));
  assert.equal(copy.description, VIDEO_SEO_TECH_RU.description);
  const component = await (await import("node:fs/promises")).readFile(new URL("../src/components/catalog/seo-article.tsx", import.meta.url), "utf8");
  assert.match(component, /article\.id === "videos"[\s\S]*<h1 itemProp="headline"/);
});
