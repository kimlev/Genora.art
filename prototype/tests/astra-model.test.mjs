import assert from "node:assert/strict";
import test from "node:test";
import { commercialModels, commercialMarkup } from "../src/lib/catalog/commercial-models.ts";
import { sortModelsByStrength } from "../src/lib/catalog/model-rank.ts";
import { textModelsFromCatalog } from "../src/lib/catalog/public-models.ts";
import { modelUseDescription, canonicalModelUseId } from "../src/lib/i18n/copy/model-use.ts";
import { SERVED_LOCALE_CODES } from "../src/lib/i18n/served-locales.ts";
import { getCommercialModelMetrics } from "../src/lib/model-metrics.ts";
import { billedTokensForAverageRequest, billedTokensForLargeContext } from "../src/lib/token-spend-estimate.ts";
import { calculateCommercialUsageCredits } from "../src/lib/billing-math.ts";
import { BALANCE_TOKENS_PER_USD } from "../src/lib/billing.ts";
import { readdir, readFile } from "node:fs/promises";

test("Astra is first in OpenAI and public catalog, with Integrator prices and no invented votes", () => {
  const astra = commercialModels.find((model) => model.id === "gpt-6-astra");
  assert.ok(astra);
  assert.equal(astra.name, "GPT-6 Astra");
  assert.equal(astra.provider, "OpenAI");
  assert.equal(astra.inputPer1MUsd, 10.3 * commercialMarkup);
  assert.equal(astra.cachedInputPer1MUsd, 1.03 * commercialMarkup);
  assert.equal(astra.outputPer1MUsd, 51.5 * commercialMarkup);
  assert.deepEqual(sortModelsByStrength(commercialModels.filter((m) => m.provider === "OpenAI")).slice(0,5).map((m) => m.id),
    ["gpt-6-astra", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.5-pro"]);
  assert.equal(textModelsFromCatalog([])[0].id, astra.id);
  assert.deepEqual(getCommercialModelMetrics(astra), { score: 0, votes: 0 });
});
test("Astra descriptions cover all languages and date-suffixed history IDs", () => {
  for (const locale of SERVED_LOCALE_CODES) assert.ok(modelUseDescription(locale, "gpt-6-astra"));
  assert.equal(canonicalModelUseId("gpt-6-astra-20260909"), "gpt-6-astra");
});
test("Astra appears first in the homepage available-model strip for every locale", async () => {
  const directory = new URL("../src/lib/i18n/locales/", import.meta.url);
  for (const file of (await readdir(directory)).filter((name) => name.endsWith(".ts"))) {
    const source = await readFile(new URL(file, directory), "utf8");
    assert.match(source, /models:\s*\[\s*"GPT-6 Astra",\s*"GPT-5\.6 Terra"/, file);
  }
});
test("Astra average estimate is priced even before its first real request", () => {
  const astra = commercialModels.find((m) => m.id === "gpt-6-astra");
  assert.ok(billedTokensForAverageRequest(astra) > 0);
  assert.equal(billedTokensForAverageRequest(astra), billedTokensForLargeContext(astra));
});
test("Astra cached/long-context costs are billed from the actual upstream amount, not charged twice", () => {
  for (const cost of [1.03, 10.3, 20.6, 77.25]) {
    const price = calculateCommercialUsageCredits({ inputTokens: 1_000_000, outputTokens: 0,
      costInputPer1MUsd: 10.3, costOutputPer1MUsd: 51.5, upstreamCostUsd: cost,
      billingMultiplier: commercialMarkup, balanceTokensPerUsd: BALANCE_TOKENS_PER_USD });
    assert.equal(price.exactRevenueUsd, cost * commercialMarkup);
  }
});
