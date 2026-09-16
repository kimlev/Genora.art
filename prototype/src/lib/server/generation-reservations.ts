import "server-only";
import type { PoolClient } from "pg";
import { paidTokensSpent } from "@/lib/billing";
import { creditUserTokens, DEBIT_USER_BALANCE_SQL } from "@/lib/server/paid-balance";
import { query } from "@/lib/server/db";

export async function dispatchReservedGeneration(jobId: string): Promise<boolean> {
  const rows = await query(
    "UPDATE generation_reservations SET dispatched_at=now() WHERE job_id=$1 AND status='held' AND dispatched_at IS NULL RETURNING job_id", [jobId]);
  if (rows.length) return true;
  const existing = await query("SELECT job_id FROM generation_reservations WHERE job_id=$1", [jobId]);
  return existing.length === 0; // Jobs created before this release have no reservation.
}

type Reservation = { tokens: string; paid_tokens: string; status: string; transaction_id: string };

export async function reserveGenerationTokens(client: PoolClient, jobId: string, userId: string, tokens: number) {
  if (!Number.isSafeInteger(tokens) || tokens <= 0) throw new Error("GENERATION_PRICE_UNAVAILABLE");
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [userId]);
  const wallet = await client.query<{ balance_tokens: string; paid_balance_tokens: string }>(
    "SELECT balance_tokens,paid_balance_tokens FROM users WHERE id=$1 FOR UPDATE", [userId]);
  const total = Number(wallet.rows[0]?.balance_tokens ?? 0);
  if (!wallet.rowCount || total < tokens) throw Object.assign(new Error("INSUFFICIENT_BALANCE"), { balanceTokens: total });
  const paid = paidTokensSpent(Number(wallet.rows[0].paid_balance_tokens), total, tokens);
  const debit = await client.query(DEBIT_USER_BALANCE_SQL, [userId, tokens]);
  const ledger = await client.query<{ id: string }>(
    "INSERT INTO balance_transactions(user_id,kind,token_delta,note) VALUES($1,'usage',$2,$3) RETURNING id",
    [userId, -tokens, `Удержание за генерацию ${jobId}`]);
  await client.query(
    "INSERT INTO generation_reservations(job_id,user_id,tokens,paid_tokens,transaction_id) VALUES($1,$2,$3,$4,$5)",
    [jobId, userId, tokens, paid, ledger.rows[0].id]);
  return Number(debit.rows[0].balance_tokens);
}

// Call after locking the job and user; legacy jobs have no reservation.
export async function generationReservation(client: PoolClient, jobId: string, userId: string) {
  const result = await client.query<Reservation>(
    "SELECT tokens,paid_tokens,status,transaction_id FROM generation_reservations WHERE job_id=$1 AND user_id=$2 FOR UPDATE", [jobId, userId]);
  const hold = result.rows[0];
  if (hold?.status === "refunded") throw new Error("GENERATION_ALREADY_REFUNDED");
  return hold;
}

export async function captureGenerationTokens(client: PoolClient, jobId: string, userId: string, usageId: string, note: string) {
  const hold = await generationReservation(client, jobId, userId);
  if (!hold) return false;
  await client.query("UPDATE balance_transactions SET usage_entry_id=$2,note=$3 WHERE id=$1", [hold.transaction_id, usageId, note]);
  await client.query("UPDATE generation_reservations SET status='captured',updated_at=now() WHERE job_id=$1 AND status='held'", [jobId]);
  return true;
}

export async function refundGenerationTokens(client: PoolClient, jobId: string, userId: string, onlyUndispatched = false) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [userId]);
  await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [userId]);
  const result = await client.query<Reservation & { dispatched_at: Date | null }>(
    "SELECT tokens,paid_tokens,status,transaction_id,dispatched_at FROM generation_reservations WHERE job_id=$1 AND user_id=$2 FOR UPDATE", [jobId, userId]);
  const hold = result.rows[0];
  if (hold?.status === "captured") return false;
  if (onlyUndispatched && hold?.dispatched_at) return false;
  if (!hold || hold.status === "refunded") return true;
  await creditUserTokens(client, userId, Number(hold.tokens), Number(hold.paid_tokens));
  await client.query("INSERT INTO balance_transactions(user_id,kind,token_delta,note) VALUES($1,'adjustment',$2,$3)",
    [userId, Number(hold.tokens), `Возврат за неудачную генерацию ${jobId}`]);
  await client.query("UPDATE generation_reservations SET status='refunded',updated_at=now() WHERE job_id=$1", [jobId]);
  return true;
}
