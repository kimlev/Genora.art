import assert from "node:assert/strict";
import test from "node:test";

import { billedTokensFromUsd } from "../src/lib/billing.ts";
import {
  AVERAGE_SPEND_MULTIPLIER,
  LARGE_CONTEXT_INPUT_TOKENS,
  LARGE_CONTEXT_OUTPUT_TOKENS,
  averageImageTokens,
  averageTierCosts,
  billedTokensForAverageRequest,
  billedTokensForLargeContext,
  estimateFromDailyRates,
  estimateTokenSpend,
  requestsFromTokens,
  spendEnoughCostTokens,
  averageCatalogSongTokens,
} from "../src/lib/token-spend-estimate.ts";
import { AVERAGE_VIDEO_SECONDS, averageCatalogVideoTokens } from "../src/lib/catalog/video-studio.ts";

test("prices a large-context request from client rates", () => {
  const billed = billedTokensForLargeContext({ inputPer1MUsd: 2.5, outputPer1MUsd: 15 });
  const usd = (LARGE_CONTEXT_INPUT_TOKENS * 2.5 + LARGE_CONTEXT_OUTPUT_TOKENS * 15) / 1_000_000;
  assert.equal(billed, billedTokensFromUsd(usd, 1));
  assert.ok(billed > 0);
});

test("splits models into light, medium and heavy averages", () => {
  const tiers = averageTierCosts([
    { inputPer1MUsd: 0.1, outputPer1MUsd: 0.4 },
    { inputPer1MUsd: 2, outputPer1MUsd: 10 },
    { inputPer1MUsd: 30, outputPer1MUsd: 180 },
  ]);
  assert.ok(tiers.light < tiers.medium);
  assert.ok(tiers.medium < tiers.heavy);
});

test("counts how many requests a top-up can cover", () => {
  assert.equal(requestsFromTokens(1_000, 250), 4);
  assert.equal(requestsFromTokens(100, 0), 0);
});

test("averages 1K and 2K image prices from catalog keys", () => {
  const prices = [
    { "1K:default": 800, "2K:default": 1_600 },
    { "1024x1024": 1_000, "2048x2048": 2_000 },
  ];
  assert.equal(averageImageTokens(prices, "1k"), 900);
  assert.equal(averageImageTokens(prices, "2k"), 1_800);
});

test("applies the provider multiplier to the integrator average request cost", () => {
  const billed = billedTokensForAverageRequest({
    inputPer1MUsd: 2.5,
    outputPer1MUsd: 15,
    averageRequestCostUsd: 0.01,
    billingMultiplier: 2.5,
  });
  assert.equal(billed, billedTokensFromUsd(0.01, 2.5));
});

test("dest daily rates convert average USD into tokens once, then divide the top-up", () => {
  const textTokens = spendEnoughCostTokens(0.02);
  const imageTokens = spendEnoughCostTokens(0.03);
  assert.equal(textTokens, billedTokensFromUsd(0.02, AVERAGE_SPEND_MULTIPLIER));
  assert.equal(imageTokens, billedTokensFromUsd(0.03, AVERAGE_SPEND_MULTIPLIER));
  const songTokens = spendEnoughCostTokens(0.08);
  const videoTokens = spendEnoughCostTokens(0.4);
  assert.deepEqual(estimateFromDailyRates(10_000, textTokens, imageTokens, songTokens, videoTokens), {
    text: Math.round(requestsFromTokens(10_000, textTokens) * 1.3),
    images: requestsFromTokens(10_000, imageTokens),
    songs: requestsFromTokens(10_000, songTokens),
    videos: requestsFromTokens(10_000, videoTokens),
  });
});

test("averages every catalog song price, or weights models by request count", () => {
  const models = [
    { provider: "google", id: "lyria", token_prices: { 30: 400, 120: 1_200 } },
    { provider: "mureka", id: "v8", duration_control: false, token_price_auto: 2_000 },
  ];
  assert.equal(averageCatalogSongTokens(models), 1_200);
  assert.equal(averageCatalogSongTokens(models, [
    { provider: "google", model: "lyria", requestCount: 3 },
    { provider: "mureka", model: "v8", requestCount: 1 },
  ]), 1_100);
});

test("averages catalog video prices for an 8 second clip", () => {
  assert.equal(AVERAGE_VIDEO_SECONDS, 8);
  assert.equal(averageCatalogVideoTokens([
    { tariffs: [{ key: "720p", resolution: "720p", sound: ["on"], usd: 0.1, tokens: 100 }] },
    { tariffs: [{ key: "1080p", resolution: "1080p", sound: ["on"], usd: 0.2, tokens: 200 }] },
  ]), 1_200);
});

test("builds the spend estimate from credited tokens", () => {
  const estimate = estimateTokenSpend(10_000, [
    { inputPer1MUsd: 0.1, outputPer1MUsd: 0.4 },
    { inputPer1MUsd: 2, outputPer1MUsd: 10 },
    { inputPer1MUsd: 30, outputPer1MUsd: 180 },
  ], [{ "1K": 500, "2K": 1_000 }]);
  assert.ok(estimate.text.light >= estimate.text.medium);
  assert.ok(estimate.text.medium >= estimate.text.heavy);
  assert.ok(estimate.images.quality1k >= estimate.images.quality2k);
});
