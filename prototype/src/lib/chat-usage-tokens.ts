import { alignUsageTokens } from "./credits";

export type ChatUsageLedger = {
  conversationId: string;
  createdAt: Date | string;
  billedInput?: number;
  billedOutput?: number;
  billed?: number;
  rawInput?: number;
  rawOutput?: number;
};

export type ChatUsageMessage = {
  id: string;
  role: string;
  conversationId?: string;
  createdAt: Date | string;
  tokenCount?: number | null;
};

const PAIR_SLACK_MS = 2_000;

function timeOf(value: Date | string): number {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function alignedChatUsage(row: ChatUsageLedger) {
  return alignUsageTokens({
    billedInput: row.billedInput,
    billedOutput: row.billedOutput,
    billed: row.billed,
    rawInput: row.rawInput,
    rawOutput: row.rawOutput,
  });
}

/** Ставит общее списание только на ответ модели. На вход ничего не пишем. */
export function applyAlignedUsageToMessages<T extends ChatUsageMessage>(
  messages: T[],
  usageRows: ChatUsageLedger[],
): T[] {
  if (messages.length === 0 || usageRows.length === 0) return messages;
  const next = new Map(messages.map((message) => [
    message.id,
    { ...message, tokenCount: message.role === "user" ? 0 : message.tokenCount },
  ]));
  const sortedUsage = [...usageRows].sort((left, right) => timeOf(left.createdAt) - timeOf(right.createdAt));

  for (const usage of sortedUsage) {
    const conversationId = usage.conversationId;
    if (!conversationId) continue;
    const ledger = alignedChatUsage(usage);
    if (ledger.billedTokens <= 0) continue;
    const usageTime = timeOf(usage.createdAt);
    const inConversation = messages.filter((message) => message.conversationId === conversationId);

    const assistant = inConversation
      .filter((message) => message.role === "assistant" && timeOf(message.createdAt) >= usageTime - PAIR_SLACK_MS)
      .sort((left, right) => timeOf(left.createdAt) - timeOf(right.createdAt) || left.id.localeCompare(right.id))[0];

    if (assistant) next.set(assistant.id, { ...next.get(assistant.id)!, tokenCount: ledger.billedTokens });
  }

  return messages.map((message) => next.get(message.id) ?? message);
}
