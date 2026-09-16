import { creditsToTokens, roundPriceTokens, usdToPayForCredits } from "./credits";

export const BALANCE_TOKENS_PER_USD = 10_000;
export const MINIMUM_TOP_UP_USD = 5;
export const MAXIMUM_TOP_UP_USD = 1_000;

export function billedTokensFromUsd(costUsd:number,billingMultiplier:number):number{
  if(!Number.isFinite(costUsd)||costUsd<0||!Number.isFinite(billingMultiplier)||billingMultiplier<0)return 0;
  if(costUsd===0||billingMultiplier===0)return 0;
  return roundPriceTokens(Math.max(1,Math.round(costUsd*billingMultiplier*BALANCE_TOKENS_PER_USD)));
}

/** Фактическое списание — то же округление, что и у цены на кнопке. */
export function chargedTokensFromUsd(costUsd:number,billingMultiplier:number):number{
  return billedTokensFromUsd(costUsd,billingMultiplier);
}

export type TopUpAmountIssue = "required" | "below-minimum" | "above-maximum";

export function topUpAmountIssue(amountUsd:number):TopUpAmountIssue|null{
  if(!Number.isFinite(amountUsd))return "required";
  if(amountUsd<MINIMUM_TOP_UP_USD)return "below-minimum";
  if(amountUsd>MAXIMUM_TOP_UP_USD)return "above-maximum";
  return null;
}

export function topUpBonus(amountUsd: number): number {
  if (amountUsd > 100) return 0.2;
  if (amountUsd >= 50) return 0.15;
  if (amountUsd >= 20) return 0.1;
  return 0;
}

export function creditedTokens(amountUsd: number): number {
  const safeAmount = Number.isFinite(amountUsd) ? Math.max(0, amountUsd) : 0;
  return Math.round(safeAmount * BALANCE_TOKENS_PER_USD * (1 + topUpBonus(safeAmount)));
}

export function creditedTokensFromCredits(credits: number): number {
  return creditsToTokens(credits);
}

export function paidUsdForCredits(credits: number): number {
  return usdToPayForCredits(credits);
}

export function paidTokensFromUsd(amountUsd: number): number {
  const safeAmount = Number.isFinite(amountUsd) ? Math.max(0, amountUsd) : 0;
  return Math.round(safeAmount * BALANCE_TOKENS_PER_USD);
}

export function usdFromPaidTokens(paidBalanceTokens: number): number {
  const safe = Number.isFinite(paidBalanceTokens) ? Math.max(0, paidBalanceTokens) : 0;
  return safe / BALANCE_TOKENS_PER_USD;
}

export function paidTokensSpent(paidBalanceTokens: number, totalBalanceTokens: number, spendTokens: number): number {
  const paid = Math.max(0, Number.isFinite(paidBalanceTokens) ? paidBalanceTokens : 0);
  const total = Math.max(0, Number.isFinite(totalBalanceTokens) ? totalBalanceTokens : 0);
  const spend = Math.max(0, Number.isFinite(spendTokens) ? spendTokens : 0);
  const gift = Math.max(0, total - paid);
  return Math.max(0, Math.min(paid, spend - gift));
}

export function nextPaidBalanceAfterSpend(paidBalanceTokens: number, totalBalanceTokens: number, spendTokens: number): number {
  const paid = Math.max(0, Number.isFinite(paidBalanceTokens) ? paidBalanceTokens : 0);
  const total = Math.max(0, Number.isFinite(totalBalanceTokens) ? totalBalanceTokens : 0);
  const spend = Math.max(0, Number.isFinite(spendTokens) ? spendTokens : 0);
  return Math.max(0, Math.min(total - spend, paid - paidTokensSpent(paid, total, spend)));
}

/** Сколько токенов запроса ушло ниже нуля — это долг, доход по нему появится при пополнении. */
export function unpaidOverdraftTokens(totalBalanceTokens: number, spendTokens: number): number {
  const total = Number.isFinite(totalBalanceTokens) ? totalBalanceTokens : 0;
  const spend = Math.max(0, Number.isFinite(spendTokens) ? spendTokens : 0);
  return Math.max(0, Math.round(spend - Math.max(0, total)));
}

export function topUpAfterOverdraft(input: {
  balanceTokens: number;
  paidBalanceTokens: number;
  creditedTokens: number;
  paidTokens: number;
}): {
  balanceTokens: number;
  paidBalanceTokens: number;
  paidCollected: number;
  giftCollected: number;
} {
  const balance = Number.isFinite(input.balanceTokens) ? Math.trunc(input.balanceTokens) : 0;
  const paid = Math.max(0, Number.isFinite(input.paidBalanceTokens) ? Math.trunc(input.paidBalanceTokens) : 0);
  const credited = Math.max(0, Number.isFinite(input.creditedTokens) ? Math.trunc(input.creditedTokens) : 0);
  const paidAdded = Math.max(0, Number.isFinite(input.paidTokens) ? Math.trunc(input.paidTokens) : 0);
  const debt = Math.max(0, -balance);
  const cleared = Math.min(debt, credited);
  const paidCollected = Math.min(cleared, paidAdded);
  return {
    balanceTokens: balance + credited,
    paidBalanceTokens: Math.max(0, paid + paidAdded - paidCollected),
    paidCollected,
    giftCollected: cleared - paidCollected,
  };
}
