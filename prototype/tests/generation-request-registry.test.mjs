import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Genora creates its own durable request UUID before parsing each generation body", async () => {
  const registry = await read("../src/lib/server/generation-request-registry.ts");
  assert.match(registry, /randomUUID\(\)/);
  assert.match(registry, /INSERT INTO generation_request_registry/);
  assert.match(registry, /status='running'/);

  for (const path of [
    "../src/app/api/chat/completions/route.ts",
    "../src/app/api/images/generations/route.ts",
    "../src/app/api/video/generations/route.ts",
    "../src/app/api/music/generations/route.ts",
  ]) {
    const route = await read(path);
    assert.ok(route.indexOf("registerGenerationRequest(user.id") < route.indexOf("request.json()"), path);
    assert.match(route, /failGenerationRequest\(requestId/);
  }
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
