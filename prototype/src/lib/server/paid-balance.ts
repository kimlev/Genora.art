import { topUpAfterOverdraft, usdFromPaidTokens } from "@/lib/billing";
import type { PoolClient } from "pg";

export const ANSWER_REQUIRES_TOP_UP = "ANSWER_REQUIRES_TOP_UP";

export const DEBIT_USER_BALANCE_SQL = `UPDATE users SET
  paid_balance_tokens = GREATEST(0, paid_balance_tokens - GREATEST(0, $2::bigint - GREATEST(0, balance_tokens - paid_balance_tokens))),
  balance_tokens = balance_tokens - $2::bigint,
  status = CASE WHEN status='registration' AND email_verified_at IS NOT NULL THEN 'active' ELSE status END,
  updated_at = now()
WHERE id = $1
RETURNING balance_tokens, paid_balance_tokens`;

export function topUpBalanceFromError(error: unknown): number | undefined {
  const value = Number((error as { balanceTokens?: unknown } | null)?.balanceTokens);
  return Number.isFinite(value) ? value : undefined;
}

async function collectOverdraft(client: PoolClient, userId: string, paidCollected: number, giftCollected: number): Promise<void> {
  let remainingPaid = Math.max(0, Math.trunc(paidCollected));
  let remainingGift = Math.max(0, Math.trunc(giftCollected));
  if (remainingPaid === 0 && remainingGift === 0) return;
  const rows = await client.query<{ id: string; unpaid_tokens: string }>(
    "SELECT id, unpaid_tokens FROM usage_entries WHERE user_id=$1 AND unpaid_tokens>0 ORDER BY created_at ASC FOR UPDATE",
    [userId],
  );
  for (const row of rows.rows) {
    let unpaid = Number(row.unpaid_tokens);
    if (remainingPaid > 0 && unpaid > 0) {
      const take = Math.min(unpaid, remainingPaid);
      await client.query(
        "UPDATE usage_entries SET unpaid_tokens=unpaid_tokens-$2, revenue_usd=revenue_usd+$3 WHERE id=$1",
        [row.id, take, usdFromPaidTokens(take)],
      );
      unpaid -= take;
      remainingPaid -= take;
    }
    if (remainingGift > 0 && unpaid > 0) {
      const take = Math.min(unpaid, remainingGift);
      await client.query("UPDATE usage_entries SET unpaid_tokens=unpaid_tokens-$2 WHERE id=$1", [row.id, take]);
      remainingGift -= take;
    }
    if (remainingPaid === 0 && remainingGift === 0) break;
  }
}

export async function creditUserTokens(
  client: PoolClient,
  userId: string,
  creditedTokens: number,
  paidTokens: number,
): Promise<{ balanceTokens: number; paidBalanceTokens: number }> {
  const wallet = await client.query<{ balance_tokens: string; paid_balance_tokens: string }>(
    "SELECT balance_tokens, paid_balance_tokens FROM users WHERE id=$1 FOR UPDATE",
    [userId],
  );
  if (!wallet.rows[0]) throw new Error("USER_NOT_FOUND");
  const next = topUpAfterOverdraft({
    balanceTokens: Number(wallet.rows[0]?.balance_tokens ?? 0),
    paidBalanceTokens: Number(wallet.rows[0]?.paid_balance_tokens ?? 0),
    creditedTokens,
    paidTokens,
  });
  await collectOverdraft(client, userId, next.paidCollected, next.giftCollected);
  await client.query(
    `UPDATE users SET
      balance_tokens=$2,
      paid_balance_tokens=$3,
      updated_at=now()
    WHERE id=$1`,
    [userId, next.balanceTokens, next.paidBalanceTokens],
  );
  return { balanceTokens: next.balanceTokens, paidBalanceTokens: next.paidBalanceTokens };
}
