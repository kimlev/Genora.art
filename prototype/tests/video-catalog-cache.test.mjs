import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../src/app/api/video/catalog/route.ts";
import { invalidateImageCatalogCache } from "../src/lib/server/image-catalog-cache.ts";

test("catalog coalesces requests, expires, and refreshes prices after admin changes", async () => {
  const originalFetch = globalThis.fetch;
  const originalPool = globalThis.genoraPool;
  const originalNow = Date.now;
  const base = process.env.INTEGRATOR_BASE_URL;
  const key = process.env.INTEGRATOR_API_KEY;
  let calls = 0;
  let multiplier = "2";
  let clock = originalNow();
  process.env.INTEGRATOR_BASE_URL = "https://integrator.test";
  process.env.INTEGRATOR_API_KEY = "test-only";
  Date.now = () => clock;
  globalThis.fetch = async () => {
    calls++;
    await new Promise((resolve) => setImmediate(resolve));
    return Response.json({ providers: [{ id: "p", label: "P" }], models: [{
      provider: "p", id: "m", label: "M", modes: ["text-to-video"], sound: ["off"],
      resolutions: ["720p"], price_per_second_usd: { "720p": 0.1 },
    }] });
  };
  const query = async (sql) => ({ rows: sql.startsWith("SELECT")
    ? sql.includes("ai_models") ? [{ id: "video:p:m", markup_multiplier: multiplier }] : [{ id: "p", billing_multiplier: multiplier }]
    : [] });
  globalThis.genoraPool = { query, connect: async () => ({ query, release() {} }) };
  try {
    invalidateImageCatalogCache();
    const first = await Promise.all([GET(), GET(), GET()]);
    assert.equal(calls, 1);
    assert.equal((await first[0].json()).models[0].multiplier, 2);
    await GET();
    assert.equal(calls, 1);
    multiplier = "4";
    invalidateImageCatalogCache();
    assert.equal((await (await GET()).json()).models[0].multiplier, 4);
    assert.equal(calls, 2);
    clock += 6_000;
    await GET();
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.genoraPool = originalPool;
    Date.now = originalNow;
    if (base === undefined) delete process.env.INTEGRATOR_BASE_URL; else process.env.INTEGRATOR_BASE_URL = base;
    if (key === undefined) delete process.env.INTEGRATOR_API_KEY; else process.env.INTEGRATOR_API_KEY = key;
  }
});
