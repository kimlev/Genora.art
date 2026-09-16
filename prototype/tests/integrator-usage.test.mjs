import assert from "node:assert/strict";
import test from "node:test";
import { chargedTokensFromUsd } from "@/lib/billing";
import { isAbortOrTimeout, isPipeBreak, normalizeIntegratorUsageItem } from "@/lib/integrator-usage";
import { isWarehouseTerminal, warehousePollDelay } from "@/lib/integrator-warehouse";

test("normalizeIntegratorUsageItem reads camelCase and snake_case cost", () => {
  const camel = normalizeIntegratorUsageItem({
    requestId: "88722bfe-e298-47ce-b5c8-b71127ae2c9e",
    status: "ok",
    costUsd: 0.113954148,
    latencyMs: 128474,
  });
  const snake = normalizeIntegratorUsageItem({
    request_id: "13799ace-c669-495e-a24a-d6530a641459",
    status: "ok",
    cost_usd: 0.403288875,
    latency_ms: 159519,
  });
  assert.equal(camel?.requestId, "88722bfe-e298-47ce-b5c8-b71127ae2c9e");
  assert.equal(camel?.costUsd, 0.113954148);
  assert.equal(snake?.requestId, "13799ace-c669-495e-a24a-d6530a641459");
  assert.equal(snake?.costUsd, 0.403288875);
  assert.equal(normalizeIntegratorUsageItem({ status: "ok" }), null);
});

test("chargedTokensFromUsd keeps Integrator video cost in history", () => {
  assert.equal(chargedTokensFromUsd(0.403288875, 2), 8100);
  assert.equal(chargedTokensFromUsd(0.113954148, 2), 2300);
  assert.ok(chargedTokensFromUsd(0.403288875, 2) > 0);
});

test("isAbortOrTimeout recognizes fetch abort", () => {
  assert.equal(isAbortOrTimeout(Object.assign(new Error("This operation was aborted"), { name: "AbortError" })), true);
  assert.equal(isAbortOrTimeout(new Error("The operation was aborted due to timeout")), true);
  assert.equal(isAbortOrTimeout(new Error("VIDEO_ASSET_MISSING")), false);
});

test("isPipeBreak recognizes dropped connection", () => {
  assert.equal(isPipeBreak(new Error("fetch failed")), true);
  assert.equal(isPipeBreak(Object.assign(new Error("socket hang up"), { name: "TypeError" })), true);
  assert.equal(isPipeBreak(new Error("MODEL_NOT_AVAILABLE")), false);
});

test("warehouse poll slows down after the first minute", () => {
  assert.equal(warehousePollDelay(0), 2000);
  assert.equal(warehousePollDelay(14_999), 2000);
  assert.equal(warehousePollDelay(15_000), 5000);
  assert.equal(warehousePollDelay(59_999), 5000);
  assert.equal(warehousePollDelay(60_000), 10_000);
  assert.equal(isWarehouseTerminal("ready"), true);
  assert.equal(isWarehouseTerminal("error"), true);
  assert.equal(isWarehouseTerminal("expired"), true);
  assert.equal(isWarehouseTerminal("in_progress"), false);
});
