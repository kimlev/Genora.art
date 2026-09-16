import assert from "node:assert/strict";
import test from "node:test";
import { integratorImageCatalog } from "../src/lib/server/integrator.ts";

test("image catalog retries a cold network failure and then serves its cached value", async () => {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  const base = process.env.INTEGRATOR_BASE_URL;
  const key = process.env.INTEGRATOR_API_KEY;
  let calls = 0;
  let now = 1_000;
  let fail = false;
  process.env.INTEGRATOR_BASE_URL = "https://integrator.test";
  process.env.INTEGRATOR_API_KEY = "test-only";
  Date.now = () => now;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1 || fail) throw new TypeError("fetch failed");
    return Response.json({ providers: [], styles: [], models: [] });
  };

  try {
    const catalog = await integratorImageCatalog();
    assert.deepEqual(catalog.models, []);
    assert.equal(calls, 2);
    assert.equal(await integratorImageCatalog(), catalog);
    assert.equal(calls, 2);

    now += 31_000;
    fail = true;
    assert.equal(await integratorImageCatalog(), catalog);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(calls, 4);
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
    if (base === undefined) delete process.env.INTEGRATOR_BASE_URL; else process.env.INTEGRATOR_BASE_URL = base;
    if (key === undefined) delete process.env.INTEGRATOR_API_KEY; else process.env.INTEGRATOR_API_KEY = key;
  }
});
