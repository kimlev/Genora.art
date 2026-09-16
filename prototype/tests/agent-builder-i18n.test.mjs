import assert from "node:assert/strict";
import test from "node:test";

import { ar } from "../src/lib/i18n/locales/ar.ts";
import { en } from "../src/lib/i18n/locales/en.ts";
import { ru } from "../src/lib/i18n/locales/ru.ts";

test("agent builder and language menu follow the selected locale", () => {
  assert.equal(ru.agents.builderNew, "Новый AI-агент");
  assert.equal(en.agents.builderNew, "New AI agent");
  assert.equal(ru.agents.filterText, "Текст");
  assert.equal(ru.agents.filterImages, "Изображение");
  assert.equal(ru.agents.filterVideo, "Видео");
  assert.equal(ru.agents.contextText, "Текст");
  assert.equal(en.agents.contextVideo, "Video");
  assert.equal(ar.agents.builderNew, "وكيل ذكاء اصطناعي جديد");
  assert.notEqual(ar.agents.builderSave, ru.agents.builderSave);
  assert.notEqual(ar.agents.builderCancel, ru.agents.builderCancel);
  assert.equal(en.workspace.language, "Language");
  assert.equal(ru.workspace.language, "Язык");
  assert.equal(ar.workspace.language, "اللغة");
  assert.ok(ar.agents.builderAiHelp.length > 1);
  assert.equal(en.chat.depthTitle, "Response depth");
  assert.equal(ru.chat.depthTitle, "Глубина ответа");
  assert.equal(en.studio.quality, "Quality");
  assert.equal(en.studio.style, "Style");
  assert.equal(ru.studio.quality, "Качество");
  assert.equal(ar.studio.style, "النمط");
});

test("studio and chat chrome follow the selected locale", async () => {
  const { workspaceUiCopy } = await import("../src/lib/i18n/workspace-ui-copy.ts");
  assert.equal(workspaceUiCopy("en").disclaimerStudio.includes("mistakes"), true);
  assert.equal(workspaceUiCopy("ru").disclaimerStudio.includes("ошибаться"), true);
  assert.equal(workspaceUiCopy("en").formats["1:1"], "Posts and cards");
  assert.equal(workspaceUiCopy("ru").formats["1:1"], "Посты и карточки");
  assert.equal(workspaceUiCopy("en").qualityDescs.default.includes("Balance"), true);
  assert.equal(workspaceUiCopy("en").styleDescs.photorealistic.includes("Realistic"), true);
  assert.equal(workspaceUiCopy("en").models["ideogram-v4"].toLowerCase().includes("text"), true);
  assert.equal(workspaceUiCopy("ar").addPhoto.length > 1, true);
  assert.notEqual(workspaceUiCopy("en").takePhoto, workspaceUiCopy("ru").takePhoto);
});
