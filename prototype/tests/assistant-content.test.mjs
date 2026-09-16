import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeAssistantContent } from "../src/lib/assistant-content.ts";

test("убирает утечку search_query в начале ответа", () => {
  const raw = `ысл.search_query(query="Apple iPhone models compare current lineup 2026 iPhone 17 Pro iPhone 17 Air", max_results=5) Если коротко: лучший выбор — iPhone 16 Pro.`;
  assert.equal(sanitizeAssistantContent(raw), "Если коротко: лучший выбор — iPhone 16 Pro.");
});

test("не трогает обычный текст без вызова инструмента", () => {
  const text = "Лучший выбор для большинства — iPhone 16 Pro.";
  assert.equal(sanitizeAssistantContent(text), text);
});
