import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { extractHeadings, markdownToHtml } from "../src/lib/blog/markdown-html.ts";
import { placeArticleGraphics } from "../src/lib/server/blogoro-graphics.ts";
import { verifyBlogoroSignature } from "../src/lib/server/blogoro-signature.ts";

test("accepts a valid Blogoro HMAC signature and rejects a wrong one", () => {
  const body = JSON.stringify({ event: "article.publish", article: { slug: "test" } });
  const secret = "test-secret";
  const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  assert.equal(verifyBlogoroSignature(body, signature, secret), true);
  assert.equal(verifyBlogoroSignature(body, signature, "other-secret"), false);
  assert.equal(verifyBlogoroSignature(body, null, secret), false);
});

test("turns markdown into HTML without changing heading order", () => {
  const html = markdownToHtml("## Сначала\n\nТекст.\n\n## Потом\n\nЕщё текст.");
  assert.match(html, /<h2 id="сначала">Сначала<\/h2>/);
  assert.ok(html.indexOf("Сначала") < html.indexOf("Потом"));
});

test("renders a GitHub-flavored markdown table as HTML", () => {
  const html = markdownToHtml([
    "| Задача | Инструмент |",
    "|---|---|",
    "| Код | DeepSeek или Qwen |",
    "| Локально | Llama |",
  ].join("\n"));
  assert.match(html, /<table>/);
  assert.match(html, /<th>Задача<\/th>/);
  assert.match(html, /<td>DeepSeek или Qwen<\/td>/);
  assert.equal(html.includes("| Задача |"), false);
});

test("collects H2 headings for the article outline", () => {
  const headings = extractHeadings("## Выбор модели\n\n## Сравнение");
  assert.deepEqual(headings.map((item) => item.title), ["Выбор модели", "Сравнение"]);
});

test("replaces an image already in the article instead of adding a second copy", () => {
  const markdown = [
    "## Почему бесплатный доступ к ИИ бывает разным",
    "",
    "![Разница между бесплатным тарифом, пробным доступом и оплатой по факту](https://api.blogoro.pro/competitor-images/abc.png)",
    "",
    "*Разница между бесплатным тарифом, пробным доступом и оплатой по факту*",
    "",
    "Текст раздела.",
    "",
    "### Как выбрать русскоязычный сервис под конкретную задачу",
    "",
    "![Алгоритм выбора ИИ-инструмента по типу задачи](https://api.blogoro.pro/competitor-images/def.png)",
    "",
    "Алгоритм выбора ИИ-инструмента по типу задачи Ещё текст.",
  ].join("\n");
  const next = placeArticleGraphics(markdown, [
    {
      url: "/blogoro/media/111",
      alt: "Разница между бесплатным тарифом, пробным доступом и оплатой по факту",
      caption: "Разница между бесплатным тарифом, пробным доступом и оплатой по факту",
      placement: "Почему бесплатный доступ к ИИ бывает разным",
    },
    {
      url: "/blogoro/media/222",
      alt: "Алгоритм выбора ИИ-инструмента по типу задачи",
      caption: "Алгоритм выбора ИИ-инструмента по типу задачи",
      placement: "Как выбрать русскоязычный сервис под конкретную задачу",
    },
  ], "Русскоязычные ИИ-сервисы: как пользоваться бесплатно");
  assert.equal(next.includes("https://api.blogoro.pro/competitor-images/"), false);
  assert.equal(next.includes("*Разница между бесплатным тарифом"), false);
  assert.equal(next.match(/\/blogoro\/media\/111/g)?.length, 1);
  assert.equal(next.match(/\/blogoro\/media\/222/g)?.length, 1);
  assert.ok(next.indexOf("/blogoro/media/111") < next.indexOf("Текст раздела."));
  assert.ok(next.indexOf("### Как выбрать") < next.indexOf("/blogoro/media/222"));
  assert.match(next, /Текст раздела\./);
  assert.match(next, /Ещё текст\./);
});

test("puts a missing image after H3 and does not dump leftovers at the end", () => {
  const markdown = "## Раздел\n\nТекст.\n\n### Подраздел\n\nЕщё текст.";
  const next = placeArticleGraphics(markdown, [
    {
      url: "/blogoro/media/333",
      alt: "Схема",
      caption: "Схема",
      placement: "Подраздел",
    },
    {
      url: "/blogoro/media/444",
      alt: "Русскоязычные ИИ-сервисы: как пользоваться бесплатно",
      caption: "Русскоязычные ИИ-сервисы: как пользоваться бесплатно",
      placement: null,
    },
  ], "Русскоязычные ИИ-сервисы: как пользоваться бесплатно");
  assert.ok(next.indexOf("### Подраздел") < next.indexOf("/blogoro/media/333"));
  assert.ok(next.indexOf("/blogoro/media/333") < next.indexOf("Ещё текст."));
  assert.equal(next.includes("/blogoro/media/444"), false);
});
