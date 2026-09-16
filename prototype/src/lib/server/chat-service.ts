import "server-only";

import { sanitizeAssistantContent } from "@/lib/assistant-content";
import { BALANCE_TOKENS_PER_USD, paidTokensSpent, unpaidOverdraftTokens, usdFromPaidTokens } from "@/lib/billing";
import { calculateCommercialUsageCredits } from "@/lib/billing-math";
import { getAgentById } from "@/lib/mock/agents";
import { getSystemAgentOverride } from "@/lib/server/system-agents";
import { isVideoPromptAgent, videoPromptFpsFromAnalysis, videoPromptUsesContactSheets, type VideoPromptInputAnalysis } from "@/lib/video-prompt-agent";
import { estimateAttachmentInputTokens, resolveReportedChatUsage, type ChatAttachmentPayload } from "@/lib/chat-attachments";
import { chatUiCopy } from "@/lib/i18n/copy/chat-ui";
import type { PoolClient } from "pg";
import { getPool } from "./db";
import { integratorProviderId } from "@/lib/provider-id";
import { integratorChat, integratorTranscribe, type IntegratorChatResult, type IntegratorMessageContent } from "./integrator";
import { chatOutputTokenLimit, clampChatDepthForModel, isGemmaChatModel } from "@/lib/chat-request-policy";
import { ANSWER_REQUIRES_TOP_UP, DEBIT_USER_BALANCE_SQL } from "./paid-balance";
import { calculateUsagePricing } from "./pricing";
import { PERSIST_USER_LOCALE_SQL, usageHistoryCopy, usageHistoryLocale } from "@/lib/usage-history-copy";
import type { Locale } from "@/lib/locale-from-request";
import { replaceVideosWithContactSheets } from "./video-prompt-contact-sheets";
import { runSolVideoPromptWorkflow } from "./video-prompt-sol-workflow";

type Depth = "fast" | "balanced" | "deep" | "auto";

const reasoningByDepth: Record<Depth, string> = { fast: "low", balanced: "medium", deep: "high", auto: "medium" };
const memoryByDepth: Record<Depth, "shallow" | "standard" | "deep"> = { fast: "shallow", balanced: "standard", deep: "deep", auto: "standard" };

export const MINIMUM_REQUEST_BALANCE_TOKENS = 1_000;
const MINIMUM_OUTPUT_TOKENS = 256;

export type PreparedRequestAttachments = {
  promptSuffix: string;
  fileParts: Exclude<IntegratorMessageContent, string>;
};

export async function prepareRequestAttachments(
  attachments: ChatAttachmentPayload[] = [],
  locale?: Locale | null,
): Promise<PreparedRequestAttachments> {
  const audio = attachments.filter((item) => item.kind === "audio");
  const transcripts = await Promise.all(audio.map(async (item) => ({
    name: item.name,
    text: await integratorTranscribe({ audioBase64: item.dataBase64, mime: item.mime, filename: item.name }),
  })));
  // Подпись уходит в запрос к модели, поэтому она должна быть на языке пользователя
  const voiceLabel = chatUiCopy(locale ?? "en").voiceMessage;
  return {
    promptSuffix: transcripts.filter((item) => item.text).map((item) => `${voiceLabel} «${item.name}»:\n${item.text}`).join("\n\n"),
    fileParts: attachments.filter((item) => item.kind !== "audio").map((item) => ({
      type: "file" as const,
      file: { filename: item.name, mime: item.mime, data_base64: item.dataBase64 },
    })),
  };
}

export async function agentPrompt(client: PoolClient, userId: string, agentId?: string | null, locale?: Locale | null): Promise<{ name: string; prompt: string | null }> {
  const noAgent = usageHistoryCopy(locale).noAgent;
  if (!agentId) return { name: noAgent, prompt: null };
  const override = await getSystemAgentOverride(agentId, client);
  const builtIn = getAgentById(agentId);
  if (override) {
    return {
      name: override.name || builtIn?.name || noAgent,
      prompt: override.systemPrompt ?? builtIn?.systemPrompt ?? null,
    };
  }
  if (builtIn) return { name: builtIn.name, prompt: builtIn.systemPrompt };
  const custom = await client.query<{ name: string; system_prompt: string }>(
    "SELECT name,system_prompt FROM custom_agents WHERE id=$1 AND user_id=$2", [agentId, userId],
  );
  return custom.rows[0] ? { name: custom.rows[0].name, prompt: custom.rows[0].system_prompt } : { name: noAgent, prompt: null };
}

export async function executeModelRequest(input: {
  client?: PoolClient;
  userId: string;
  providerId: string;
  modelId: string;
  prompt: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  images?: string[];
  attachments?: ChatAttachmentPayload[];
  preparedAttachments?: PreparedRequestAttachments;
  depth: Depth;
  agentId?: string | null;
  chatId: string;
  source: string;
  timezone?: string;
  billingBudgetTokens: number;
  webSearch?: boolean;
  timeoutMs?: number;
  requestId?: string;
  locale?: Locale | null;
  systemPrompt?: string | null;
  agentName?: string;
}): Promise<{ result: IntegratorChatResult; pricing: NonNullable<Awaited<ReturnType<typeof calculateUsagePricing>>>; agentName: string }> {
  const depth = clampChatDepthForModel(input.modelId, input.depth);
  const contactSheetInput = isVideoPromptAgent(input.agentId) && videoPromptUsesContactSheets(input.modelId)
    ? await replaceVideosWithContactSheets(input.attachments ?? [])
    : null;
  const preparedAttachments = contactSheetInput
    ? await prepareRequestAttachments(contactSheetInput.attachments, input.locale).then((prepared) => ({
        ...prepared,
        promptSuffix: [prepared.promptSuffix, contactSheetInput.instruction].filter(Boolean).join("\n\n"),
      }))
    : input.preparedAttachments ?? await prepareRequestAttachments(input.attachments, input.locale);
  const ownedClient = !input.client;
  const client = input.client ?? await getPool().connect();
  let prepared: {
    messages: Array<{ role: "system" | "user" | "assistant"; content: IntegratorMessageContent }>;
    reasoning: string | undefined;
    maxOutputTokens: number;
    agentName: string;
    videoFps: number | undefined;
  };
  try {
    prepared = await prepareModelCall({ ...input, client, preparedAttachments, depth });
  } finally {
    if (ownedClient) client.release();
  }
  const result = contactSheetInput
    ? await runSolVideoPromptWorkflow({
        provider: integratorProviderId(input.providerId),
        model: input.modelId,
        systemMessages: prepared.messages.flatMap((message) => message.role === "system"
          ? [{ role: "system" as const, content: message.content }]
          : []),
        contactSheets: contactSheetInput.attachments.filter((item) => item.name.startsWith("video-contact-sheets-")),
        originalVideos: (input.attachments ?? []).filter((item) => item.kind === "video"),
        contactSheetInstruction: contactSheetInput.instruction,
        reasoning: prepared.reasoning,
        chatId: input.chatId,
        memoryDepth: memoryByDepth[depth] ?? "standard",
        source: input.source,
        timezone: input.timezone,
        maxOutputTokens: prepared.maxOutputTokens,
        timeoutMs: input.timeoutMs,
        requestId: input.requestId,
      })
    : await integratorChat({
        provider: integratorProviderId(input.providerId),
        model: input.modelId,
        messages: prepared.messages,
        reasoning: prepared.reasoning,
        chatId: input.chatId.slice(0, 120),
        memoryDepth: memoryByDepth[depth] ?? "standard",
        source: input.source.slice(0, 120),
        timezone: input.timezone,
        maxOutputTokens: prepared.maxOutputTokens,
        webSearch: input.webSearch,
        timeoutMs: input.timeoutMs,
        requestId: input.requestId,
        agentId: input.agentId ?? undefined,
        videoFps: prepared.videoFps,
      });
  for (const choice of result.choices) {
    if (choice?.message) choice.message.content = sanitizeAssistantContent(choice.message.content ?? "");
  }
  const resolved = resolveChatUsageTokens(result, input.attachments, input.images);
  result.usage.prompt_tokens = resolved.inputTokens;
  result.usage.completion_tokens = resolved.outputTokens;
  result.usage.total_tokens = resolved.inputTokens + resolved.outputTokens;
  const pricing = await calculateUsagePricing(
    input.modelId,
    resolved.inputTokens,
    resolved.outputTokens,
    result.usage.cost_usd,
    { minimumBilledTokens: resolved.hasMedia ? 100 : 0 },
  );
  if (!pricing) throw new Error("MODEL_NOT_AVAILABLE");
  return { result, pricing, agentName: prepared.agentName };
}

function resolveChatUsageTokens(
  result: IntegratorChatResult,
  attachments?: ChatAttachmentPayload[],
  images?: string[],
) {
  const estimated = estimateAttachmentInputTokens(attachments, images);
  const answer = result.choices[0]?.message.content ?? "";
  return resolveReportedChatUsage({
    promptTokens: Number(result.usage.prompt_tokens) || 0,
    completionTokens: Number(result.usage.completion_tokens) || 0,
    estimatedInputTokens: estimated,
    answerLength: answer.length,
  });
}

async function prepareModelCall(input: {
  client: PoolClient;
  userId: string;
  providerId: string;
  modelId: string;
  prompt: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  images?: string[];
  attachments?: ChatAttachmentPayload[];
  preparedAttachments: PreparedRequestAttachments;
  depth: Depth;
  agentId?: string | null;
  billingBudgetTokens: number;
  locale?: Locale | null;
  systemPrompt?: string | null;
  agentName?: string;
}): Promise<{
  messages: Array<{ role: "system" | "user" | "assistant"; content: IntegratorMessageContent }>;
  reasoning: string | undefined;
  maxOutputTokens: number;
  agentName: string;
  videoFps: number | undefined;
}> {
  const agent = input.systemPrompt != null
    ? { name: input.agentName ?? usageHistoryCopy(input.locale).agentHelp, prompt: input.systemPrompt }
    : await agentPrompt(input.client, input.userId, input.agentId, input.locale);
  const history = (input.history ?? []).filter((message) => message.content.trim().length > 0).slice(-20);
  const promptText = [input.prompt, input.preparedAttachments.promptSuffix].filter(Boolean).join("\n\n");
  const legacyImages = input.images?.map((url) => ({ type: "image_url" as const, image_url: { url } })) ?? [];
  const promptParts = [...legacyImages, ...input.preparedAttachments.fileParts];
  const promptContent = promptParts.length
    ? [{ type: "text" as const, text: promptText }, ...promptParts]
    : promptText;
  const messages = [
    ...(agent.prompt ? [{ role: "system" as const, content: agent.prompt }] : []),
    ...history,
    { role: "user" as const, content: promptContent },
  ];
  const capabilities = await input.client.query<{ capabilities: {
    reasoning?: { defaultValue?: string; options?: Array<{ value?: string }> } | null;
    videoInputAnalysis?: VideoPromptInputAnalysis | null;
  } | null }>(
    "SELECT capabilities FROM ai_models WHERE id=$1 AND active=true", [input.modelId],
  );
  const reasoningCapability = isGemmaChatModel(input.modelId)
    ? undefined
    : capabilities.rows[0]?.capabilities?.reasoning;
  const depth = clampChatDepthForModel(input.modelId, input.depth);
  const requestedReasoning = reasoningByDepth[depth] ?? "medium";
  const reasoningOptions = reasoningCapability?.options?.map((option) => option.value).filter((value): value is string => Boolean(value)) ?? [];
  const maxReasoning = ["xhigh", "high", "max"].find((value) => reasoningOptions.includes(value))
    ?? (reasoningOptions.includes("on") ? "on" : reasoningOptions.at(-1));
  const reasoning = reasoningCapability
    ? (isVideoPromptAgent(input.agentId) && maxReasoning
      ? maxReasoning
      : reasoningOptions.includes(requestedReasoning)
        ? requestedReasoning
        : reasoningOptions.includes("on") && reasoningOptions.includes("off")
          ? (depth === "fast" ? "off" : "on")
          : reasoningCapability.defaultValue ?? reasoningOptions[0])
    : undefined;
  const maxOutputTokens = chatOutputTokenLimit(input.modelId, depth);
  if (maxOutputTokens < MINIMUM_OUTPUT_TOKENS) throw new Error("INSUFFICIENT_BALANCE");
  const videoFps = isVideoPromptAgent(input.agentId)
    ? videoPromptFpsFromAnalysis(capabilities.rows[0]?.capabilities?.videoInputAnalysis)
    : undefined;
  return { messages, reasoning, maxOutputTokens, agentName: agent.name, videoFps };
}

export async function recordUsage(input: {
  client: PoolClient;
  userId: string;
  result: IntegratorChatResult;
  pricing: NonNullable<Awaited<ReturnType<typeof calculateUsagePricing>>>;
  conversationId?: string | null;
  battleId?: string | null;
  chatTitle: string;
  agentName: string;
  integratorChatId: string;
  usageId?: string;
  locale?: Locale | null;
  note?: string;
  atCost?: boolean;
  /** Фиксированное списание, например помощь в создании агента: 1000 токенов. */
  fixedBilledTokens?: number;
}): Promise<{ balanceTokens: number }> {
  const { client, result, pricing } = input;
  const copy = usageHistoryCopy(input.locale);
  let billed = input.fixedBilledTokens != null && input.fixedBilledTokens > 0
    ? {
      billedInputTokens: input.fixedBilledTokens,
      billedOutputTokens: 0,
      billedTokens: input.fixedBilledTokens,
    }
    : input.atCost
    ? calculateCommercialUsageCredits({
      inputTokens: result.usage.prompt_tokens,
      outputTokens: result.usage.completion_tokens,
      costInputPer1MUsd: pricing.costInputPer1MUsd,
      costOutputPer1MUsd: pricing.costOutputPer1MUsd,
      upstreamCostUsd: pricing.costUsd,
      billingMultiplier: 1,
      balanceTokensPerUsd: BALANCE_TOKENS_PER_USD,
    })
    : {
      billedInputTokens: pricing.billedInputTokens,
      billedOutputTokens: pricing.billedOutputTokens,
      billedTokens: pricing.billedTokens,
    };
  if (billed.billedTokens <= 0 && pricing.costUsd > 0) {
    billed = {
      billedInputTokens: 0,
      billedOutputTokens: 100,
      billedTokens: 100,
    };
  }
  const billingMultiplier = input.fixedBilledTokens != null || input.atCost ? 1 : pricing.billingMultiplier;
  const wallet = await client.query<{ balance_tokens: string; paid_balance_tokens: string }>(
    "SELECT balance_tokens, paid_balance_tokens FROM users WHERE id=$1",
    [input.userId],
  );
  const totalTokens = Number(wallet.rows[0]?.balance_tokens ?? 0);
  const paidTokens = Number(wallet.rows[0]?.paid_balance_tokens ?? 0);
  const revenueUsd = usdFromPaidTokens(paidTokensSpent(paidTokens, totalTokens, billed.billedTokens));
  const unpaidTokens = unpaidOverdraftTokens(totalTokens, billed.billedTokens);
  const inserted = await client.query<{ id: string }>(`INSERT INTO usage_entries(id,user_id,conversation_id,battle_id,chat_title,model,model_id,provider,agent,
    input_tokens,cached_input_tokens,output_tokens,thinking_tokens,billed_input_tokens,billed_output_tokens,billed_tokens,unpaid_tokens,billing_multiplier,cost_input_per_1m_usd,cost_output_per_1m_usd,
    client_input_per_1m_usd,client_output_per_1m_usd,cost_usd,revenue_usd,tool_cost_usd,latency_ms,integrator_chat_id,upstream_request_id,pricing_change_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)
    ON CONFLICT DO NOTHING RETURNING id`, [input.usageId ?? `integrator-${result.id}`, input.userId, input.conversationId ?? null,
    input.battleId ?? null, input.chatTitle.slice(0, 200), pricing.modelName, pricing.modelId, pricing.provider, input.agentName,
    result.usage.prompt_tokens, result.usage.cached_prompt_tokens ?? 0, result.usage.completion_tokens, result.usage.thinking_tokens ?? 0,
    billed.billedInputTokens, billed.billedOutputTokens, billed.billedTokens, unpaidTokens, billingMultiplier, pricing.costInputPer1MUsd, pricing.costOutputPer1MUsd,
    pricing.clientInputPer1MUsd, pricing.clientOutputPer1MUsd, pricing.costUsd, revenueUsd,
    result.usage.tool_cost_usd ?? 0, result.meta.latency_ms, input.integratorChatId, result.id, pricing.pricingChangeId]);
  if (!inserted.rowCount) {
    const remaining = await client.query<{ balance_tokens: string }>("SELECT balance_tokens FROM users WHERE id=$1", [input.userId]);
    return { balanceTokens: Number(remaining.rows[0]?.balance_tokens ?? 0) };
  }
  await client.query(`INSERT INTO balance_transactions(user_id,kind,token_delta,note,usage_entry_id)
    VALUES($1,'usage',$2,$3,$4)`, [input.userId, -billed.billedTokens, input.note ?? copy.usageNote(pricing.modelName), inserted.rows[0].id]);
  const debit = await client.query<{ balance_tokens: string }>(DEBIT_USER_BALANCE_SQL, [input.userId, billed.billedTokens]);
  if (!debit.rowCount) throw new Error(ANSWER_REQUIRES_TOP_UP);
  await client.query(PERSIST_USER_LOCALE_SQL, [input.userId, usageHistoryLocale(input.locale)]);
  return { balanceTokens: Number(debit.rows[0].balance_tokens) };
}
