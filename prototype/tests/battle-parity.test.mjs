import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const shell = await readFile(new URL("../src/components/battle/battle-shell.tsx", import.meta.url), "utf8");
const route = await readFile(new URL("../src/app/api/battles/route.ts", import.meta.url), "utf8");
const actions = await readFile(new URL("../src/components/chat/response-actions.tsx", import.meta.url), "utf8");
const catalog = await readFile(new URL("../src/lib/catalog/commercial-models.ts", import.meta.url), "utf8");
const rank = await readFile(new URL("../src/lib/catalog/model-rank.ts", import.meta.url), "utf8");
const chatShell = await readFile(new URL("../src/components/chat/chat-shell.tsx", import.meta.url), "utf8");
const chatRoute = await readFile(new URL("../src/app/api/chat/completions/route.ts", import.meta.url), "utf8");

test("battle answers use the shared chat actions and credit display", () => {
  assert.match(shell, /<ResponseActions/);
  assert.match(shell, /formatCompactTokens\(failed \? 0 : answer\.inputTokens \+ answer\.outputTokens, locale\)/);
  assert.doesNotMatch(shell, /workspace\.tokens/);
  assert.match(actions, /ThumbsUp/);
  assert.match(actions, /ThumbsDown/);
  assert.match(actions, /Share2/);
  assert.match(actions, /Copy/);
});

test("VideoPromt battle allows the same supported model on both sides", () => {
  assert.doesNotMatch(shell, /current\.model !== model/);
  assert.doesNotMatch(route, /String\(right\.model\) === String\(left\.model\)/);
});

test("both battle slots can select every VideoPromt provider before the live catalog loads", () => {
  assert.match(shell, /videoPromptModelForProvider\(provider, allowedIds\)/);
  assert.match(catalog, /id: "gemini-3\.8-flash"/);
  assert.match(catalog, /id: "qwen3\.8-max"/);
  assert.match(rank, /"gemini-3\.8-flash"/);
  assert.match(rank, /"qwen3\.8-max"/);
});

test("VideoPromt defaults to deep but preserves a manually selected depth", () => {
  assert.doesNotMatch(route, /left\.depth = videoPromptDepthForModel/);
  assert.doesNotMatch(route, /right\.depth = videoPromptDepthForModel/);
  assert.match(chatShell, /depth: depthSelection, agentId: requestAgentId/);
  assert.match(chatShell, /depthId: depthSelection/);
  assert.match(chatRoute, /if \(depth === "auto"\) depth = videoPromptDepthForModel\(modelId\)/);
});

test("VideoPromt uses the selected model and never replaces it with the menu default", () => {
  assert.match(chatShell, /if \(isVideoPromptAgent\(requestAgentId\) && !videoPromptModelAllowed\(modelSelection\)\) return/);
  assert.match(chatShell, /const requestedModelId = modelSelection/);
  assert.match(chatShell, /videoPromptProviderForModel\(requestedModelId\)/);
  assert.match(chatRoute, /if \(!videoPromptModelAllowed\(modelId\)\) return jsonError\(apiAppCopy\(locale\)\.invalidRequest\)/);
  assert.doesNotMatch(chatRoute, /modelId = VIDEO_PROMPT_DEFAULT_MODEL/);
  assert.match(route, /!videoPromptModelAllowed\(String\(left\.model\)\) \|\| !videoPromptModelAllowed\(String\(right\.model\)\)/);
  assert.doesNotMatch(route, /left\.model = VIDEO_PROMPT_DEFAULT_MODEL|right\.model = videoPromptAlternateModel/);
});
