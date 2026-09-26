import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Genora creates its own durable request UUID before parsing each generation body", async () => {
  const registry = await read("../src/lib/server/generation-request-registry.ts");
  assert.match(registry, /randomUUID\(\)/);
  assert.match(registry, /INSERT INTO generation_request_registry/);
  assert.match(registry, /status='running'/);
  assert.match(registry, /completeGenerationRequest/);

  for (const path of [
    "../src/app/api/chat/completions/route.ts",
    "../src/app/api/images/generations/route.ts",
    "../src/app/api/video/generations/route.ts",
    "../src/app/api/music/generations/route.ts",
    "../src/app/api/battles/route.ts",
    "../src/app/api/agents/prompt-help/route.ts",
    "../src/app/api/characters/route.ts",
    "../src/app/api/music/tracks/[id]/cover/route.ts",
    "../src/app/api/music/lyrics/route.ts",
    "../src/app/api/transcribe/route.ts",
  ]) {
    const route = await read(path);
    assert.ok(route.indexOf("registerGenerationRequest(user.id") < route.indexOf("request.json()"), path);
    assert.match(route, /registerGenerationRequest\(user\.id/);
    assert.match(route, /failGenerationRequest\(/);
  }
  const battle = await read("../src/app/api/battles/route.ts");
  assert.equal((battle.match(/registerGenerationRequest\(user\.id/g) ?? []).length, 2, "each compared model call gets its own Genora ID");
  assert.match(battle, /usageId: `chat-\$\{requestId\}`/);
  assert.match(battle, /integratorChatId: `ms-battle-\$\{user\.id\.slice\(0,8\)\}-\$\{setup\.sessionId\}-\$\{side\}`/);
});

test("admin Requests and Usage read the Genora request registry and expose status", async () => {
  const requests = await read("../src/app/api/admin/requests/route.ts");
  const usage = await read("../src/lib/server/admin-dashboard-data.ts");
  const usageUi = await read("../src/components/admin/admin-dashboard.tsx");
  assert.match(requests, /FROM generation_request_registry r/);
  assert.match(usage, /FROM generation_request_registry r/);
  assert.match(usage, /request_id:string|null;request_status:string/);
  assert.match(usageUi, /usageStatusLabels\[item\.requestStatus\]/);
});
