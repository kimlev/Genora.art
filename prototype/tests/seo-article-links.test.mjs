import assert from "node:assert/strict";
import test from "node:test";

import { articleHeadingId, localizeArticleHref } from "../src/lib/content/seo-article-links.ts";

test("article headings use the same anchors as the markdown table of contents", () => {
  assert.equal(
    articleHeadingId("Как проходит создание изображения: от идеи до результата"),
    "как-проходит-создание-изображения-от-идеи-до-результата",
  );
});

test("Genora.art article links keep the production destination on the current locale and host", () => {
  assert.equal(localizeArticleHref("https://genora.art/ru/models", "en"), "/en/models");
  assert.equal(localizeArticleHref("https://www.genora.art/ru#arena-ai", "ru"), "/ru#arena-ai");
  assert.equal(localizeArticleHref("#раздел", "ru"), "#раздел");
  assert.equal(localizeArticleHref("https://example.com/page", "ru"), "https://example.com/page");
});
