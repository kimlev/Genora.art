/**
 * Внутренняя валюта отображения: 1 кредит = 1 000 токенов = $0.10.
 * Символ временный, пока не утвердят иконку.
 */
export const CREDIT_GLYPH = "★";
export const TOKENS_PER_CREDIT = 1_000;
export const USD_PER_CREDIT = 0.1;
export const CREDIT_STEP_TOKENS = 100;
export const MIN_TOP_UP_CREDITS = 50;
export const MAX_TOP_UP_CREDITS = 10_000;
export const TOP_UP_CREDIT_PRESETS = [100, 200, 500] as const;

export type CreditRoundMode = "spend" | "price";

/** Списание: вверх до 100 токенов (0,1★). Любая ненулевая сумма — минимум 0,1★, ноль списать нельзя. */
export function roundSpendTokens(tokens: number): number {
  const safe = Number.isFinite(tokens) ? Math.max(0, tokens) : 0;
  if (safe <= 0) return 0;
  return Math.max(CREDIT_STEP_TOKENS, Math.ceil(safe / CREDIT_STEP_TOKENS) * CREDIT_STEP_TOKENS);
}

/** Тариф: до ближайших 100 токенов, 50+ вверх. 750 → 800 → 0,8★; 1008 → 1000 → 1★. */
export function roundPriceTokens(tokens: number): number {
  const safe = Number.isFinite(tokens) ? Math.max(0, tokens) : 0;
  return Math.round(safe / CREDIT_STEP_TOKENS) * CREDIT_STEP_TOKENS;
}

export function tokensToCredits(tokens: number, mode: CreditRoundMode = "spend"): number {
  const rounded = mode === "price" ? roundPriceTokens(tokens) : roundSpendTokens(tokens);
  return rounded / TOKENS_PER_CREDIT;
}

/** Одно правило для админки и кабинета: только общее списание, шаг 0,1★ вверх. */
export function alignUsageTokens(input: {
  billedInput?: number;
  billedOutput?: number;
  billed?: number;
  rawInput?: number;
  rawOutput?: number;
}) {
  const billed = Number.isFinite(input.billed) ? Math.max(0, Number(input.billed)) : 0;
  const stored = (Number.isFinite(input.billedInput) ? Math.max(0, Number(input.billedInput)) : 0)
    + (Number.isFinite(input.billedOutput) ? Math.max(0, Number(input.billedOutput)) : 0);
  const billedTokens = roundSpendTokens(billed > 0 ? billed : stored);
  return {
    inputTokens: 0,
    outputTokens: billedTokens,
    billedTokens,
  };
}

export function creditsToTokens(credits: number): number {
  const safe = Number.isFinite(credits) ? Math.max(0, credits) : 0;
  return Math.round(safe * TOKENS_PER_CREDIT);
}

export function creditsToUsd(credits: number): number {
  const safe = Number.isFinite(credits) ? Math.max(0, credits) : 0;
  return Math.round(safe * USD_PER_CREDIT * 100) / 100;
}

/** 1 млн токенов = 1000 ★, поэтому цена за ★ = цена за 1M / 1000. */
export function usdPerStarFromPer1M(valuePer1M: number): number {
  const safe = Number.isFinite(valuePer1M) ? Math.max(0, valuePer1M) : 0;
  return safe / (1_000_000 / TOKENS_PER_CREDIT);
}

export function formatUsd(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  if (safe === 0) return "$0.00";
  if (safe < 0.01) return `$${Number(safe.toFixed(6))}`;
  if (safe < 1) return `$${Number(safe.toFixed(4))}`;
  return `$${safe.toFixed(2)}`;
}

export function formatUsdPerStar(valuePer1M: number): string {
  return formatUsd(usdPerStarFromPer1M(valuePer1M));
}

/** 100 → 0%, от 200 → 10%, от 500 → 20%. */
export function topUpDiscount(credits: number): number {
  if (!Number.isFinite(credits)) return 0;
  if (credits >= 500) return 0.2;
  if (credits >= 200) return 0.1;
  return 0;
}

export function usdToPayForCredits(credits: number): number {
  const gross = creditsToUsd(credits);
  return Math.round(gross * (1 - topUpDiscount(credits)) * 100) / 100;
}

export type TopUpCreditsIssue = "required" | "below-minimum" | "above-maximum";

export function topUpCreditsIssue(credits: number): TopUpCreditsIssue | null {
  if (!Number.isFinite(credits)) return "required";
  if (credits < MIN_TOP_UP_CREDITS) return "below-minimum";
  if (credits > MAX_TOP_UP_CREDITS) return "above-maximum";
  return null;
}

export function formatCreditAmount(credits: number, locale: string): string {
  const safe = Number.isFinite(credits) ? credits : 0;
  const digits = Number.isInteger(safe) ? 0 : 1;
  const value = new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: 1,
  }).format(safe);
  return `${value}\u00a0${CREDIT_GLYPH}`;
}

export function formatTokensAsCredits(tokens: number, locale: string, mode: CreditRoundMode = "spend"): string {
  return formatCreditAmount(tokensToCredits(tokens, mode), locale);
}
