import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { getSeoArticle } from "../src/lib/content/seo-articles.ts";
import { localizeArticleHref } from "../src/lib/content/seo-article-links.ts";
import { seoCopy } from "../src/lib/seo.ts";
import { catalogPagesCopy } from "../src/lib/i18n/copy/catalog-pages.ts";

const root = path.resolve(import.meta.dirname, "..");
const source = fs.readFileSync(path.join(root, "src/lib/content/models-seo-article-ru.ts"), "utf8");

test("Russian models page uses the supplied SEO article only for ru", () => {
  const ru = getSeoArticle("models", "ru");
  const en = getSeoArticle("models", "en");
  assert.equal(ru.title, "Как подобрать AI-модель под задачу: каталог, сравнение и расходы");
  assert.equal(en.title, "How to choose an AI model for your work: a practical guide to quality and cost");
  assert.notEqual(en.title, ru.title);
  assert.ok(ru.sections.length >= 6);
  assert.ok(ru.faq.length >= 7);
  assert.equal((source.match(/^# /gm) ?? []).length, 1);
  assert.doesNotMatch(source, /Как выбрать лучшую AI модель и не переплачивать\?/);
  assert.doesNotMatch(source, /Агрегатор нейросетей — это единая платформа/);
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
  assert.equal(copy.title, "Как подобрать AI-модель под задачу: каталог, сравнение и расходы — Genora.art");
  assert.equal(copy.description, "Практический разбор выбора AI-модели: как сравнить инструменты для текста, изображений, видео и музыки, оценить ограничения и посчитать стоимость готового результата.");
});

test("English models catalog copy does not reuse ModelStation wording", () => {
  const copy = catalogPagesCopy("en");
  assert.equal(copy.modelsTitle, "A practical shortlist of AI models for every task");
  assert.equal(copy.modelsLead, "Compare text, image, video, and music tools by the result you need, then open a model with a clear use case.");
  assert.notEqual(copy.modelsTitle, "The best AI models in one place");
  assert.notEqual(copy.modelsLead, "Find a model by task: text, image, or music. The short card description tells you what it is for.");
});

test("home metadata is distinct in English and Russian", () => {
  const en = seoCopy("/", "en");
  const ru = seoCopy("/", "ru");
  assert.equal(en.title, "Explore AI tools built for your next idea — Genora.art");
  assert.equal(en.description, "A focused set of AI tools for everyday work. Compare results, models, and costs from one workspace. 40+ models · Usage-based pricing · RU/EN");
  assert.equal(ru.title, "Откройте AI-инструменты для своих идей — Genora.art");
  assert.equal(ru.description, "Подборка AI-инструментов для ежедневных задач. Сравнивайте результаты, модели и расходы в одном рабочем пространстве. Более 40 моделей · Оплата по использованию · RU/EN");
  assert.doesNotMatch(en.description, /No VPN or foreign cards|One interface instead of a dozen tabs and API keys/);
  assert.doesNotMatch(ru.description, /Мы отобрали для вас самые эффективные модели|Один интерфейс вместо десятка вкладок и API-ключей/);
});
