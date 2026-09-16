import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("новый чат объявляет фоновый протокол, а сервер сохраняет совместимость со старыми вкладками", async () => {
  const client = await readFile(new URL("../src/components/chat/chat-shell.tsx", import.meta.url), "utf8");
  const route = await readFile(new URL("../src/app/api/chat/completions/route.ts", import.meta.url), "utf8");
  assert.match(client, /"x-genora-job-protocol": "1"/);
  assert.match(route, /request\.headers\.get\("x-genora-job-protocol"\) === "1"/);
  assert.match(route, /await executeChatJob\(chatJobInput\)/);
  assert.match(route, /completed\?\.status === "ready"/);
});

test("автовыбор сохраняется как выбор пользователя, а фактический маршрут остается в сообщении", async () => {
  const jobs = await readFile(new URL("../src/lib/server/chat-jobs.ts", import.meta.url), "utf8");
  const client = await readFile(new URL("../src/components/chat/chat-shell.tsx", import.meta.url), "utf8");
  assert.match(jobs, /selection:\s*\{/);
  assert.match(jobs, /model_id=EXCLUDED\.model_id/);
  assert.match(client, /modelId: requestedModelId === "auto" \? null : requestedModelId/);
  assert.match(client, /providerSelection === "auto" \? null : providerSelection/);
});

test("чат не передает пользовательский текст как технический source", async () => {
  const route = await readFile(new URL("../src/app/api/chat/completions/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(route, /source: String\(body\?\.title/);
  assert.match(route, /source: "Genora.art"/);
});

test("автороутер выбирает модель и провайдера после определения глубины запроса", async () => {
  const router = await readFile(new URL("../src/lib/server/auto-router.ts", import.meta.url), "utf8");
  assert.match(router, /requestedChatDepth\(input\.prompt, input\.depth, input\.locale\)/);
  assert.match(router, /rankChatRoutes\(/);
  assert.match(router, /providerId: row\.provider_id/);
  assert.match(router, /NOT IN \('image','video','music','audio'\)/);
});
