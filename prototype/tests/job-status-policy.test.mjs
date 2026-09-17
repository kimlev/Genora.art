import assert from "node:assert/strict";
import test from "node:test";
import {
  adminRequestStatus,
  isStaleRequest,
  STALE_REQUEST_AFTER_MS,
} from "../src/lib/job-status-policy.ts";

test("a ready request is successful even when the warehouse ACK is absent", () => {
  const createdAt = new Date("2026-09-15T00:37:02.965Z");
  assert.equal(adminRequestStatus("ready", createdAt, createdAt.getTime() + STALE_REQUEST_AFTER_MS * 5), "success");
});

test("a genuinely creating request becomes an error after the stale ceiling", () => {
  const now = Date.parse("2026-09-17T12:00:00.000Z");
  const fresh = new Date(now - STALE_REQUEST_AFTER_MS + 1);
  const stale = new Date(now - STALE_REQUEST_AFTER_MS);
  assert.equal(isStaleRequest(fresh, now), false);
  assert.equal(adminRequestStatus("creating", fresh, now), "running");
  assert.equal(isStaleRequest(stale, now), true);
  assert.equal(adminRequestStatus("creating", stale, now), "error");
});
