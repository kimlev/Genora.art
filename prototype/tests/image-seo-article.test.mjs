import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { IMAGE_SEO_ARTICLE_RU, IMAGE_SEO_TECH_RU } from "../src/lib/content/image-seo-article-ru.ts";
import { parseSeoMarkdown } from "../src/lib/content/parse-seo-markdown.ts";
import { getSeoArticle } from "../src/lib/content/seo-articles.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(
  join(root, "content/seo/kak-ispolzovat-neyroseti-dlya-generatsii-foto-i-kartinok.md"),
  "utf8",
);

test("RU image SEO article comes from the Downloads markdown, not the draft", () => {
  assert.equal(IMAGE_SEO_ARTICLE_RU, source);
  assert.equal(IMAGE_SEO_TECH_RU.title, "Как использовать нейросети для генерации фото и картинок?");
  assert.match(IMAGE_SEO_TECH_RU.description, /промпт/);

  const article = parseSeoMarkdown(source, "images");
  assert.equal(article.title, IMAGE_SEO_TECH_RU.title);
  assert.match(article.lead, /постановки задачи/);
  assert.ok(article.sections.some((section) => section.heading.includes("Как составить промпт")));
  assert.ok(article.sections.some((section) => section.blocks.some((block) => block.type === "table")));
  assert.equal(article.faq.length, 8);
  assert.doesNotMatch(article.lead, /заглушки/);

  const live = getSeoArticle("images", "ru");
  assert.equal(live.title, article.title);
  assert.equal(live.faq.length, 8);
  assert.doesNotMatch(source, /genora\.art\/blog\/(ai-models|image-generation|prompts|image-editing|ai-safety|ai-ethics)/);
  assert.doesNotMatch(source, /genora\.art\/(billing|arena)(?:[/"']|$)/);
  assert.match(source, /https:\/\/genora\.art\/ru\/models/);
  assert.match(source, /https:\/\/genora\.art\/ru\/images/);
  assert.match(source, /https:\/\/genora\.art\/ru\/create-foto-video/);
  assert.match(source, /https:\/\/genora\.art\/ru\/image-examples/);
  assert.match(source, /https:\/\/genora\.art\/ru\/pricing/);
  assert.match(source, /https:\/\/genora\.art\/ru\/agents/);
});
