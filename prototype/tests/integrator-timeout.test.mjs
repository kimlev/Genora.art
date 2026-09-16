import assert from "node:assert/strict";
import test from "node:test";

import { REQUEST_TIMEOUT_MS, integratorRequestTimeoutMs } from "../src/lib/integrator-timeout.ts";

test("без явного timeout используется общий лимит, Pro сам по себе его не растягивает", () => {
  assert.equal(integratorRequestTimeoutMs({ model: "gpt-5.5-pro" }), REQUEST_TIMEOUT_MS);
  assert.equal(integratorRequestTimeoutMs({ memoryDepth: "deep" }), REQUEST_TIMEOUT_MS);
  assert.equal(integratorRequestTimeoutMs({ model: "gpt-5.5-pro", timeoutMs: 50_000 }), 50_000);
});
