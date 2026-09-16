import assert from "node:assert/strict";
import test from "node:test";

import { usageHistoryCopy } from "../src/lib/usage-history-copy.ts";
import { displayUsageAgent, usageKindFromId } from "../src/lib/usage-kind.ts";

test("writes usage history labels in the selected language", () => {
  assert.equal(usageHistoryCopy("ru").imageGeneration("Ideogram 4"), "Генерация Ideogram 4");
  assert.equal(usageHistoryCopy("en").imageGeneration("Ideogram 4"), "Generation Ideogram 4");
  assert.equal(usageHistoryCopy("en").usageNote("Kimi K3"), "Usage Kimi K3");
  assert.equal(usageHistoryCopy("en").battleChatTitle("compare two answers"), "Model battle: compare two answers");
  assert.equal(usageHistoryCopy("en").bonus(25_000), "Bonus — 25\u00a0★");
  assert.equal(usageHistoryCopy("ru").registrationBonus, "Бонус за регистрацию");
  assert.equal(usageHistoryCopy("en").registrationBonus, "Sign-up bonus");
  assert.equal(usageHistoryCopy("ar").noAgent, "بدون وكيل");
});

test("usage category comes from the entry id and placeholder agents stay empty", () => {
  assert.equal(usageKindFromId("video-abc"), "video");
  assert.equal(usageKindFromId("image-abc"), "image");
  assert.equal(usageKindFromId("music-abc"), "song");
  assert.equal(usageKindFromId("integrator-abc"), "chat");
  assert.equal(displayUsageAgent("video"), "");
  assert.equal(displayUsageAgent("Песня"), "");
  assert.equal(displayUsageAgent(usageHistoryCopy("ru").noAgent), "");
  assert.equal(displayUsageAgent(usageHistoryCopy("ru").imageAgentFallback), "");
  assert.equal(displayUsageAgent("VideoPromt"), "VideoPromt");
});
