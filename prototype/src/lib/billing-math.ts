import { CREDIT_STEP_TOKENS, roundSpendTokens } from "./credits";

export type CommercialUsageCreditsInput = {
  inputTokens: number;
  outputTokens: number;
  costInputPer1MUsd: number;
  costOutputPer1MUsd: number;
  /** Full upstream request cost. It already includes provider-side tool calls. */
  upstreamCostUsd: number;
  billingMultiplier: number;
  balanceTokensPerUsd: number;
  /** When a file was sent, never leave the debit at 0. */
  minimumBilledTokens?: number;
};

const finiteNonNegative = (value: number) => Number.isFinite(value) && value > 0 ? value : 0;

/** Списание только из долларов Integrator × множитель. Без деления на вход/выход. */
export function calculateCommercialUsageCredits(input: CommercialUsageCreditsInput) {
  const upstreamCostUsd = finiteNonNegative(input.upstreamCostUsd);
  const billingMultiplier = finiteNonNegative(input.billingMultiplier);
  const balanceTokensPerUsd = finiteNonNegative(input.balanceTokensPerUsd);
  const exactRevenueUsd = upstreamCostUsd * billingMultiplier;
  const rawBilledTokens = exactRevenueUsd > 0 && balanceTokensPerUsd > 0
    ? exactRevenueUsd * balanceTokensPerUsd
    : 0;
  const minimum = finiteNonNegative(input.minimumBilledTokens ?? 0);
  const billedTokens = rawBilledTokens > 0
    ? Math.max(CREDIT_STEP_TOKENS, roundSpendTokens(rawBilledTokens), minimum)
    : 0;

  return {
    billedInputTokens: 0,
    billedOutputTokens: billedTokens,
    billedTokens,
    revenueUsd: balanceTokensPerUsd > 0 ? billedTokens / balanceTokensPerUsd : 0,
    exactRevenueUsd,
  };
}
