import "server-only";

import type { PoolClient } from "pg";
import { applyAlignedUsageToMessages, type ChatUsageLedger } from "@/lib/chat-usage-tokens";
import { query } from "@/lib/server/db";

type UsageRow = {
  conversation_id: string;
  created_at: Date;
  billed_input_tokens: string;
  billed_output_tokens: string;
  billed_tokens: string;
  input_tokens: string;
  output_tokens: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  role: string;
  created_at: Date;
  token_count: number | null;
};

function ledgerFromRow(row: UsageRow): ChatUsageLedger {
  return {
    conversationId: row.conversation_id,
    createdAt: row.created_at,
    billedInput: Number(row.billed_input_tokens),
    billedOutput: Number(row.billed_output_tokens),
    billed: Number(row.billed_tokens),
    rawInput: Number(row.input_tokens),
    rawOutput: Number(row.output_tokens),
  };
}

const USAGE_SQL = `SELECT conversation_id, created_at,
      coalesce(billed_input_tokens,0)::text billed_input_tokens,
      coalesce(billed_output_tokens,0)::text billed_output_tokens,
      coalesce(billed_tokens,0)::text billed_tokens,
      coalesce(input_tokens,0)::text input_tokens,
      coalesce(output_tokens,0)::text output_tokens
     FROM usage_entries
     WHERE user_id=$1 AND conversation_id IS NOT NULL AND deleted=false AND internal_only=false
     ORDER BY created_at`;

export async function loadUserChatUsage(userId: string): Promise<ChatUsageLedger[]> {
  const rows = await query<UsageRow>(USAGE_SQL, [userId]);
  return rows.map(ledgerFromRow);
}

export async function syncMessageUsageTokens(client: Pick<PoolClient, "query">, userId: string): Promise<void> {
  const [usage, messages] = await Promise.all([
    client.query<UsageRow>(USAGE_SQL, [userId]).then((result) => result.rows.map(ledgerFromRow)),
    client.query<MessageRow>(
      `SELECT m.id, m.conversation_id, m.role, m.created_at, m.token_count
       FROM messages m
       JOIN conversations c ON c.id=m.conversation_id
       WHERE c.user_id=$1`,
      [userId],
    ),
  ]);
  if (usage.length === 0 || messages.rowCount === 0) return;
  const aligned = applyAlignedUsageToMessages(
    messages.rows.map((row) => ({
      id: row.id,
      role: row.role,
      conversationId: row.conversation_id,
      createdAt: row.created_at,
      tokenCount: row.token_count,
    })),
    usage,
  );
  for (const message of aligned) {
    const current = messages.rows.find((row) => row.id === message.id);
    if (!current || current.token_count === message.tokenCount) continue;
    await client.query("UPDATE messages SET token_count=$2 WHERE id=$1", [message.id, message.tokenCount ?? null]);
  }
}
