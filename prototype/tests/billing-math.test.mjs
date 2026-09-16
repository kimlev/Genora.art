import assert from "node:assert/strict";
import test from "node:test";

import { calculateCommercialUsageCredits } from "../src/lib/billing-math.ts";
import { billedTokensFromUsd, chargedTokensFromUsd, nextPaidBalanceAfterSpend, paidTokensFromUsd, paidTokensSpent, topUpAfterOverdraft, topUpAmountIssue, unpaidOverdraftTokens, usdFromPaidTokens } from "../src/lib/billing.ts";
import { applyAlignedUsageToMessages } from "../src/lib/chat-usage-tokens.ts";
import { alignUsageTokens, formatUsdPerStar, tokensToCredits, topUpDiscount, usdPerStarFromPer1M, usdToPayForCredits } from "../src/lib/credits.ts";

test("bills the upstream total cost without adding provider tool cost twice", () => {
  const result = calculateCommercialUsageCredits({
    inputTokens: 10_299,
    outputTokens: 1_957,
    costInputPer1MUsd: 1.25,
    costOutputPer1MUsd: 2.5,
    upstreamCostUsd: 0.02749745,
    billingMultiplier: 3,
    balanceTokensPerUsd: 10_000,
  });

  assert.equal(result.billedInputTokens, 0);
  assert.equal(result.billedOutputTokens, 900);
  assert.equal(result.billedTokens, 900);
  assert.equal(result.revenueUsd, 0.09);
});

test("chat messages show only total spend under the assistant reply", () => {
  const next = applyAlignedUsageToMessages(
    [
      { id: "u1", role: "user", conversationId: "conv-1", createdAt: "2026-09-04T18:47:20.000Z", tokenCount: 0 },
      { id: "a1", role: "assistant", conversationId: "conv-1", createdAt: "2026-09-04T18:47:42.347Z", tokenCount: 0 },
      { id: "u2", role: "user", conversationId: "conv-2", createdAt: "2026-08-24T19:09:39.000Z", tokenCount: 1845 },
      { id: "a2", role: "assistant", conversationId: "conv-2", createdAt: "2026-08-24T19:11:57.978Z", tokenCount: 8907 },
    ],
    [
      { conversationId: "conv-1", createdAt: "2026-09-04T18:47:42.323Z", billedInput: 1800, billedOutput: 300, billed: 2100, rawInput: 1948, rawOutput: 212 },
      { conversationId: "conv-2", createdAt: "2026-08-24T19:11:57.959Z", billedInput: 1845, billedOutput: 8907, billed: 10752, rawInput: 1952, rawOutput: 1571 },
    ],
  );
  assert.equal(next[0].tokenCount, 0);
  assert.equal(next[1].tokenCount, 2100);
  assert.equal(next[2].tokenCount, 0);
  assert.equal(next[3].tokenCount, 10_800);
});

test("admin and client usage show only the total spend", () => {
  const ledger = alignUsageTokens({
    billedInput: 1_894,
    billedOutput: 206,
    billed: 2_100,
    rawInput: 1_948,
    rawOutput: 212,
  });
  assert.equal(ledger.inputTokens, 0);
  assert.equal(ledger.outputTokens, 2_100);
  assert.equal(ledger.billedTokens, 2_100);
});

test("zero Integrator dollars do not invent a debit from token counts", () => {
  const result = calculateCommercialUsageCredits({
    inputTokens: 1_900,
    outputTokens: 200,
    costInputPer1MUsd: 0.1,
    costOutputPer1MUsd: 0.4,
    upstreamCostUsd: 0,
    billingMultiplier: 3,
    balanceTokensPerUsd: 10_000,
  });

  assert.equal(result.billedTokens, 0);
  assert.equal(result.billedInputTokens, 0);
  assert.equal(result.billedOutputTokens, 0);
});

test("VideoPromt bills Integrator dollars times multiplier as one total", () => {
  const result = calculateCommercialUsageCredits({
    inputTokens: 5_381,
    outputTokens: 876,
    costInputPer1MUsd: 0.75,
    costOutputPer1MUsd: 3.75,
    upstreamCostUsd: 0.007687,
    billingMultiplier: 3,
    balanceTokensPerUsd: 10_000,
    minimumBilledTokens: 100,
  });
  assert.equal(result.billedTokens, 300);
  assert.equal(result.billedInputTokens, 0);
  assert.equal(result.billedOutputTokens, 300);
});

test("tiny Integrator cost still charges at least 0.1 star", () => {
  const result = calculateCommercialUsageCredits({
    inputTokens: 4_119,
    outputTokens: 4_329,
    costInputPer1MUsd: 1.25,
    costOutputPer1MUsd: 2.5,
    upstreamCostUsd: 0.00244,
    billingMultiplier: 3,
    balanceTokensPerUsd: 10_000,
  });

  assert.equal(result.billedTokens, 100);
  assert.equal(result.billedInputTokens, 0);
  assert.equal(result.billedOutputTokens, 100);
  assert.equal(result.revenueUsd, 0.01);
});

test("accepts top ups only from 5 through 1000 USD",()=>{
  assert.equal(topUpAmountIssue(Number.NaN),"required");
  assert.equal(topUpAmountIssue(4.99),"below-minimum");
  assert.equal(topUpAmountIssue(5),null);
  assert.equal(topUpAmountIssue(1_000),null);
  assert.equal(topUpAmountIssue(1_000.01),"above-maximum");
});

test("bills image generation from upstream USD cost and provider multiplier",()=>{
  assert.equal(billedTokensFromUsd(0.75,3),22_500);
  assert.equal(billedTokensFromUsd(0.0568935,2.5),1_400);
  assert.equal(billedTokensFromUsd(0.75,0),0);
  assert.equal(usdFromPaidTokens(billedTokensFromUsd(0.0672,3)),0.2);
  assert.equal(chargedTokensFromUsd(0.045,1),500);
  assert.equal(chargedTokensFromUsd(0.045,1),billedTokensFromUsd(0.045,1));
});

test("USD balance counts only purchased tokens, not gifts", () => {
  assert.equal(paidTokensFromUsd(20), 200_000);
  assert.equal(usdFromPaidTokens(0), 0);
  assert.equal(usdFromPaidTokens(9_226), 0.9226);
  assert.equal(nextPaidBalanceAfterSpend(0, 9_226, 1_000), 0);
  assert.equal(nextPaidBalanceAfterSpend(200_000, 220_000, 10_000), 200_000);
  assert.equal(nextPaidBalanceAfterSpend(200_000, 200_000, 50_000), 150_000);
});

test("revenue counts only tokens spent after the gift balance is gone", () => {
  assert.equal(paidTokensSpent(60_000, 62_290, 2_016), 0);
  assert.equal(usdFromPaidTokens(paidTokensSpent(60_000, 62_290, 2_016)), 0);
  assert.equal(paidTokensSpent(60_000, 62_290, 5_000), 2_710);
  assert.equal(usdFromPaidTokens(paidTokensSpent(60_000, 62_290, 5_000)), 0.271);
  assert.equal(paidTokensSpent(60_000, 60_000, 10_000), 10_000);
  assert.equal(usdFromPaidTokens(paidTokensSpent(60_000, 60_000, 10_000)), 1);
  assert.equal(paidTokensSpent(0, 2_988, 4_020), 0);
});

test("долг и доход: бесплатные 5к и запрос на 10к", () => {
  assert.equal(paidTokensSpent(0, 5_000, 10_000), 0);
  assert.equal(usdFromPaidTokens(paidTokensSpent(0, 5_000, 10_000)), 0);
  assert.equal(unpaidOverdraftTokens(5_000, 10_000), 5_000);
  const after = topUpAfterOverdraft({ balanceTokens: -5_000, paidBalanceTokens: 0, creditedTokens: 10_000, paidTokens: 10_000 });
  assert.equal(after.balanceTokens, 5_000);
  assert.equal(after.paidBalanceTokens, 5_000);
  assert.equal(after.paidCollected, 5_000);
  assert.equal(after.giftCollected, 0);
  assert.equal(usdFromPaidTokens(after.paidCollected), 0.5);
});

test("credits: spend ceils to 0.1, listed prices half-up", () => {
  assert.equal(tokensToCredits(111, "spend"), 0.2);
  assert.equal(tokensToCredits(750, "price"), 0.8);
  assert.equal(tokensToCredits(1_008, "price"), 1);
  assert.equal(topUpDiscount(100), 0);
  assert.equal(topUpDiscount(200), 0.1);
  assert.equal(topUpDiscount(300), 0.1);
  assert.equal(topUpDiscount(500), 0.2);
  assert.equal(usdToPayForCredits(300), 27);
  assert.equal(usdPerStarFromPer1M(5), 0.005);
  assert.equal(usdPerStarFromPer1M(30), 0.03);
  assert.equal(formatUsdPerStar(5), "$0.005");
  assert.equal(formatUsdPerStar(30), "$0.03");
});

test("долг и доход: платные 5к и запрос на 10к", () => {
  assert.equal(paidTokensSpent(5_000, 5_000, 10_000), 5_000);
  assert.equal(usdFromPaidTokens(paidTokensSpent(5_000, 5_000, 10_000)), 0.5);
  assert.equal(unpaidOverdraftTokens(5_000, 10_000), 5_000);
  const after = topUpAfterOverdraft({ balanceTokens: -5_000, paidBalanceTokens: 0, creditedTokens: 10_000, paidTokens: 10_000 });
  assert.equal(after.balanceTokens, 5_000);
  assert.equal(after.paidBalanceTokens, 5_000);
  assert.equal(after.paidCollected, 5_000);
});
