import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("history retries are bounded, preserve loaded results, and settle loading after failure", async () => {
  const source = await readFile(new URL("../src/components/providers/image-history-provider.tsx", import.meta.url), "utf8");
  assert.match(source, /AbortSignal.timeout\(20_000\)/);
  assert.match(source, /if \(inFlight\) \{\s*reloadQueued = true;\s*return;/);
  assert.match(source, /if \(active && reloadQueued\) void load\(\)/);
  assert.match(source, /setLoadFailed\(true\);\s*setLoadedUserId\(userId\)/);
  assert.match(source, /removeEventListener\("genora-history-refresh"/);
  assert.match(source, /item.requestId !== generation.requestId/);
});

test("restored video cards clear on success while failed cards remain visible", async () => {
  const source = await readFile(new URL("../src/components/images/image-studio.tsx", import.meta.url), "utf8");
  assert.match(source, /new Set\(videoPayload.settledJobIds \?\? \[\]\)/);
  assert.match(source, /current.filter\(\(job\) => !settledIds.has\(job.id\)\)/);
  assert.match(source, /readyVideoJobs/);
  assert.match(source, /readReadyVideoJob\(job\.id, text\)/);
  const route = await readFile(new URL("../src/app/api/video/jobs/route.ts", import.meta.url), "utf8");
  assert.match(route, /WHERE user_id=\$1 AND status='ready'/);
  assert.match(route, /listVisibleVideoJobs/);
  assert.match(route, /after\(async \(\) =>/);
  assert.match(route, /settledJobIds: settled.map/);
});
