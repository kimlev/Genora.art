import { billedTokensFromUsd } from "@/lib/billing";

/** Пока черновые параметры примера. Точный источник подставим отдельно. */
export const LARGE_CONTEXT_INPUT_TOKENS = 32_000;
export const LARGE_CONTEXT_OUTPUT_TOKENS = 2_000;

export type PricedTextModel = {
  inputPer1MUsd: number;
  outputPer1MUsd: number;
  averageRequestCostUsd?: number | null;
  billingMultiplier?: number;
};

export type TokenSpendEstimate = {
  text: { heavy: number; medium: number; light: number };
  images: { quality2k: number; quality1k: number };
};

export function billedTokensForLargeContext(model: PricedTextModel): number {
  const usd = (
    LARGE_CONTEXT_INPUT_TOKENS * finitePrice(model.inputPer1MUsd)
    + LARGE_CONTEXT_OUTPUT_TOKENS * finitePrice(model.outputPer1MUsd)
  ) / 1_000_000;
  return billedTokensFromUsd(usd, 1);
}

export function averageTierCosts(models: PricedTextModel[]): { heavy: number; medium: number; light: number } {
  const costs = models.map(billedTokensForLargeContext).filter((value) => value > 0).sort((left, right) => left - right);
  if (!costs.length) return { heavy: 0, medium: 0, light: 0 };
  const third = Math.max(1, Math.floor(costs.length / 3));
  const light = mean(costs.slice(0, third));
  const heavy = mean(costs.slice(-third));
  const middle = costs.slice(third, Math.max(third, costs.length - third));
  return { heavy, medium: mean(middle.length ? middle : costs), light };
}

export function requestsFromTokens(balanceTokens: number, costPerRequest: number): number {
  if (!Number.isFinite(balanceTokens) || balanceTokens <= 0 || !Number.isFinite(costPerRequest) || costPerRequest <= 0) return 0;
  return Math.floor(balanceTokens / costPerRequest);
}

export function averageImageTokens(priceMaps: Array<Record<string, number>>, kind: "1k" | "2k"): number {
  const values: number[] = [];
  for (const prices of priceMaps) {
    for (const [key, value] of Object.entries(prices)) {
      if (matchesImageQuality(key, kind) && Number.isFinite(value) && value > 0) values.push(value);
    }
  }
  return mean(values);
}

export const AVERAGE_SPEND_MULTIPLIER = 3;

export function billedTokensForAverageRequest(model: PricedTextModel): number {
  const average = Number(model.averageRequestCostUsd);
  const multiplier = Number(model.billingMultiplier);
  if (Number.isFinite(average) && average > 0) {
    return billedTokensFromUsd(average, Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1);
  }
  return billedTokensForLargeContext(model);
}

export function averageUsd(values: Array<number | null | undefined>): number {
  return mean(values.map(Number).filter((value) => Number.isFinite(value) && value > 0));
}

/** Среднее по строкам раздела «Цена» / песни. Если есть число запросов — средневзвешенное по моделям. */
export function averageCatalogSongTokens(
  models: Array<{
    provider?: string;
    id?: string;
    duration_control?: boolean;
    token_prices?: Record<string, number>;
    token_price_auto?: number | null;
  }>,
  usage: Array<{ provider: string; model: string; requestCount: number }> = [],
): number {
  const priced = models.map((model) => {
    const values = (model.duration_control === false && model.token_price_auto
      ? [Number(model.token_price_auto)]
      : Object.values(model.token_prices ?? {}).map(Number)
    ).filter((value) => Number.isFinite(value) && value > 0);
    return { key: `${model.provider ?? ""}:${model.id ?? ""}`, values };
  }).filter((item) => item.values.length);
  if (!priced.length) return 0;
  const weightByKey = new Map(usage.map((item) => [`${item.provider}:${item.model}`, item.requestCount]));
  if ([...weightByKey.values()].some((count) => count > 0)) {
    let sum = 0;
    let weight = 0;
    for (const item of priced) {
      const next = Math.max(1, weightByKey.get(item.key) ?? 0);
      sum += mean(item.values) * next;
      weight += next;
    }
    return weight ? sum / weight : 0;
  }
  return mean(priced.flatMap((item) => item.values));
}

export function spendEnoughCostTokens(averageUsd: number): number {
  return billedTokensFromUsd(averageUsd, AVERAGE_SPEND_MULTIPLIER);
}

export function estimateFromDailyRates(
  balanceTokens: number,
  textTokens: number,
  imageTokens: number,
  songTokens = 0,
  videoTokens = 0,
): { text: number; images: number; songs: number; videos: number } {
  return {
    text: Math.round(requestsFromTokens(balanceTokens, textTokens) * 1.3),
    images: requestsFromTokens(balanceTokens, imageTokens),
    songs: requestsFromTokens(balanceTokens, songTokens),
    videos: requestsFromTokens(balanceTokens, videoTokens),
  };
}

/** Dest: tokens / (average USD × 3 × tokens per $1). */
export function estimateAverageSpend(
  balanceTokens: number,
  models: PricedTextModel[],
  imageCostsUsd: number[],
  songCostsUsd: number[] = [],
): { text: number; images: number; songs: number; videos: number } {
  return estimateFromDailyRates(
    balanceTokens,
    spendEnoughCostTokens(averageUsd(models.map((model) => model.averageRequestCostUsd))),
    spendEnoughCostTokens(averageUsd(imageCostsUsd)),
    spendEnoughCostTokens(averageUsd(songCostsUsd)),
  );
}

export function estimateTokenSpend(
  balanceTokens: number,
  models: PricedTextModel[],
  imagePriceMaps: Array<Record<string, number>>,
): TokenSpendEstimate {
  const tiers = averageTierCosts(models);
  return {
    text: {
      heavy: requestsFromTokens(balanceTokens, tiers.heavy),
      medium: requestsFromTokens(balanceTokens, tiers.medium),
      light: requestsFromTokens(balanceTokens, tiers.light),
    },
    images: {
      quality2k: requestsFromTokens(balanceTokens, averageImageTokens(imagePriceMaps, "2k")),
      quality1k: requestsFromTokens(balanceTokens, averageImageTokens(imagePriceMaps, "1k")),
    },
  };
}

function matchesImageQuality(key: string, kind: "1k" | "2k"): boolean {
  const lower = key.toLowerCase();
  if (kind === "2k") return /\b2k\b|2048/.test(lower);
  return (/\b1k\b|1024/.test(lower)) && !/\b2k\b|2048/.test(lower);
}

function finitePrice(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
