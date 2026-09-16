import { creditsToTokens, formatTokensAsCredits } from "@/lib/credits";

export const MIN_ADMIN_BONUS_TOKENS = 5;
export const MAX_ADMIN_BONUS_TOKENS = 1_000;

/** Поле админки в отображаемых токенах (★). В баланс пишем внутренние токены. */
export function adminBonusTokens(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < MIN_ADMIN_BONUS_TOKENS || value > MAX_ADMIN_BONUS_TOKENS) return null;
  return creditsToTokens(value);
}

export function adminBonusNote(tokens: number): string {
  return `Бонус — ${formatTokensAsCredits(tokens, "ru", "spend")}`;
}
