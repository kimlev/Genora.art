import "server-only";

import { BALANCE_TOKENS_PER_USD } from "@/lib/billing";
import { calculateCommercialUsageCredits } from "@/lib/billing-math";
import { catalogPricing } from "./catalog";

export type UsagePricing = {
  provider: string;
  providerId: string;
  modelId: string;
  modelName: string;
  costInputPer1MUsd: number;
  costOutputPer1MUsd: number;
  clientInputPer1MUsd: number;
  clientOutputPer1MUsd: number;
  costUsd: number;
  revenueUsd: number;
  billingMultiplier: number;
  billedInputTokens: number;
  billedOutputTokens: number;
  billedTokens: number;
  pricingChangeId: number | null;
};

export async function calculateUsagePricing(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  upstreamCostUsd?: number,
  options?: { minimumBilledTokens?: number },
): Promise<UsagePricing | null> {
  const model = await catalogPricing(modelId);
  if (!model) return null;
  const costInputPer1MUsd = Number(model.cost_input_per_1m_usd);
  const costOutputPer1MUsd = Number(model.cost_output_per_1m_usd);
  const clientInputPer1MUsd = Number(model.client_input_per_1m_usd);
  const clientOutputPer1MUsd = Number(model.client_output_per_1m_usd);
  const calculatedCost = (inputTokens * costInputPer1MUsd + outputTokens * costOutputPer1MUsd) / 1_000_000;
  const reportedCost = Number(upstreamCostUsd);
  const costUsd = Number.isFinite(reportedCost) && reportedCost > 0 ? reportedCost : calculatedCost;
  const billingMultiplier = Number(model.billing_multiplier);
  const { billedInputTokens, billedOutputTokens, billedTokens, revenueUsd } = calculateCommercialUsageCredits({
    inputTokens,
    outputTokens,
    costInputPer1MUsd,
    costOutputPer1MUsd,
    upstreamCostUsd: costUsd,
    billingMultiplier,
    balanceTokensPerUsd: BALANCE_TOKENS_PER_USD,
    minimumBilledTokens: options?.minimumBilledTokens,
  });
  return {
    provider: model.provider_name,
    providerId: model.provider_id,
    modelId: model.id,
    modelName: model.display_name,
    costInputPer1MUsd,
    costOutputPer1MUsd,
    clientInputPer1MUsd,
    clientOutputPer1MUsd,
    costUsd,
    revenueUsd,
    billingMultiplier,
    billedInputTokens,
    billedOutputTokens,
    billedTokens,
    pricingChangeId: model.pricing_change_id === null ? null : Number(model.pricing_change_id),
  };
}
