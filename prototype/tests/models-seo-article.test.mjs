import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { getSeoArticle } from "../src/lib/content/seo-articles.ts";
import { localizeArticleHref } from "../src/lib/content/seo-article-links.ts";
import { seoCopy } from "../src/lib/seo.ts";

const root = path.resolve(import.meta.dirname, "..");
const source = fs.readFileSync(path.join(root, "src/lib/content/models-seo-article-ru.ts"), "utf8");

test("Russian models page uses the supplied SEO article only for ru", () => {
  const ru = getSeoArticle("models", "ru");
  const en = getSeoArticle("models", "en");
  assert.equal(ru.title, "Как выбрать лучшую AI модель и не переплачивать? Зачем нужны агрегаторы нейросетей?");
  assert.notEqual(en.title, ru.title);
  assert.ok(ru.sections.length >= 6);
  assert.ok(ru.faq.length >= 7);
  assert.equal((source.match(/^# /gm) ?? []).length, 1);
});

test("models article links resolve to Russian dev routes", () => {
  const links = [...source.matchAll(/https:\/\/genora\.art[^)\s]+/g)].map((match) => localizeArticleHref(match[0], "ru"));
  for (const href of ["/ru", "/ru/models", "/ru/rating", "/ru/pricing", "/ru/image-examples", "/ru/songs", "/ru/agents", "/ru/blog"]) {
    assert.ok(links.includes(href), `missing ${href}`);
  }
  assert.doesNotMatch(source, /blog\/(?:besplatnye-nejroseti-2026-obzor-servisov|vse-pro-nejroseti-kak-vybrat-ii-instrument-onlayn)/);
});

test("models page metadata follows the supplied technical brief", () => {
  const copy = seoCopy("/models", "ru");
  assert.equal(copy.title, "Как выбрать лучшую AI модель и не переплачивать? Зачем нужны агрегаторы нейросетей? — Genora.art");
  assert.equal(copy.description, "Как выбрать AI модель и не переплачивать: разбираем, зачем нужны агрегаторы нейросетей, как сравнивать модели по цене и качеству и собрать лучшие нейросети в одном месте.");
});
