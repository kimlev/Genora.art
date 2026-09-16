import assert from "node:assert/strict";
import test from "node:test";
import { createResilientCache } from "../src/lib/resilient-cache.ts";

test("resilient cache coalesces cold loads and serves stale data during refresh failures", async () => {
  const originalNow = Date.now;
  let now = 1_000;
  let calls = 0;
  let fail = false;
  let release;
  Date.now = () => now;
  const cache = createResilientCache(async () => {
    calls += 1;
    if (calls === 1) await new Promise((resolve) => { release = resolve; });
    if (fail) throw new Error("temporary outage");
    return { version: calls };
  }, 30_000);

  try {
    const first = cache.get();
    const second = cache.get();
    assert.equal(calls, 1);
    release();
    assert.deepEqual(await first, { version: 1 });
    assert.deepEqual(await second, { version: 1 });

    now += 31_000;
    fail = true;
    assert.deepEqual(await cache.get(), { version: 1 });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(calls, 2);
    assert.deepEqual(await cache.get(), { version: 1 });
  } finally {
    Date.now = originalNow;
  }
});
