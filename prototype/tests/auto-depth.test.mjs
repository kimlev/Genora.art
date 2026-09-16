import assert from "node:assert/strict";
import test from "node:test";

import { automaticDepth, weightedPromptLength } from "@/lib/auto-depth";

const reasoning = (locale) => ({ supportsReasoning: true, locale });

test("модель без рассуждения всегда отвечает быстро", () => {
  assert.equal(automaticDepth("Проанализируй архитектуру сервиса", { supportsReasoning: false, locale: "ru" }), "fast");
});

test("короткий бытовой вопрос получает быстрый ответ на любом языке", () => {
  assert.equal(automaticDepth("Привет, как дела", reasoning("ru")), "fast");
  assert.equal(automaticDepth("Hi, what is the weather today", reasoning("en")), "fast");
  assert.equal(automaticDepth("Hola, dime la hora", reasoning("es")), "fast");
  assert.equal(automaticDepth("你好，今天天气怎么样", reasoning("zh")), "fast");
  assert.equal(automaticDepth("مرحبا كيف حالك", reasoning("ar")), "fast");
});

test("просьба разобраться получает глубокий ответ на каждом языке сайта", () => {
  const prompts = {
    ru: "Сравни два подхода и обоснуй выбор",
    en: "Compare the two approaches and explain why one wins",
    zh: "对比这两种方案并说明为什么",
    hi: "दोनों तरीकों की तुलना करें",
    es: "Compara los dos enfoques paso a paso",
    fr: "Compare les deux approches étape par étape",
    ar: "قارن بين الحلين خطوة بخطوة",
    pt: "Compare as duas abordagens passo a passo",
    de: "Vergleiche beide Ansätze und begründe die Wahl",
    ja: "二つの方式を比較して理由を説明して",
    it: "Confronta i due approcci passo per passo",
    ko: "두 방식을 비교하고 이유를 알려줘",
    tr: "İki yaklaşımı karşılaştır ve neden olduğunu açıkla",
    pl: "Porównaj oba podejścia krok po kroku",
    nl: "Vergelijk beide aanpakken stap voor stap",
    sv: "Jämför de två metoderna steg för steg",
    cs: "Porovnej oba přístupy krok za krokem",
    el: "Σύγκρινε τις δύο προσεγγίσεις βήμα προς βήμα",
    ro: "Compară cele două abordări pas cu pas",
  };
  for (const [locale, prompt] of Object.entries(prompts)) {
    assert.equal(automaticDepth(prompt, reasoning(locale)), "deep", locale);
  }
});

test("английские технические слова понимаются при любом языке интерфейса", () => {
  assert.equal(automaticDepth("Debug this stack trace please", reasoning("ja")), "deep");
  assert.equal(automaticDepth("Опиши architecture решения", reasoning("ru")), "deep");
});

test("код в запросе означает разбор, а не короткий вопрос", () => {
  const prompt = "```js\nconst a = 1;\nfunction run() { return a; }\n```";
  assert.equal(automaticDepth(prompt, reasoning("nl")), "deep");
  assert.equal(automaticDepth("SELECT id FROM users;\nUPDATE users SET name='a';", reasoning("ko")), "deep");
});

test("длина запроса считается с учётом письма: иероглифы плотнее букв", () => {
  assert.equal(weightedPromptLength("abc"), 3);
  assert.equal(weightedPromptLength("日本語"), 9);
  // 312 знаков японского текста — это уже большой запрос, хотя по числу символов он короткий
  const dense = "今日の売上と在庫の推移をまとめて数字で示してください".repeat(12);
  assert.equal(dense.length < 400, true);
  assert.equal(automaticDepth(dense, reasoning("ja")), "deep");
});

test("длинный текст без ключевых слов получает глубокий ответ", () => {
  assert.equal(automaticDepth("a ".repeat(500), reasoning("en")), "deep");
});

test("составная задача из нескольких пунктов получает средний ответ", () => {
  const prompt = "Prepare a plan:\n- collect the data\n- clean the data\n- send a report to the team about the results";
  assert.equal(automaticDepth(prompt, reasoning("en")), "balanced");
  assert.equal(automaticDepth("¿Cuándo abre la tienda? ¿Y el domingo?", reasoning("es")), "balanced");
});

test("средний по длине запрос без признаков сложности отвечает средней глубиной", () => {
  assert.equal(automaticDepth("word ".repeat(60), reasoning("en")), "balanced");
});

test("язык запроса можно не знать: подсказки проверяются по всем языкам", () => {
  assert.equal(automaticDepth("Jämför de två metoderna", { supportsReasoning: true, locale: null }), "deep");
});
