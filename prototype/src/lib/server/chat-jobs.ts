import "server-only";

import { attachmentMeta, type ChatAttachmentPayload } from "@/lib/chat-attachments";
import { sanitizeAssistantContent } from "@/lib/assistant-content";
import { incrementWelcomeBonus } from "@/lib/server/welcome-bonus";
import { isHeavyChatRequest } from "@/lib/chat-request-policy";
import { executeModelRequest, recordUsage } from "@/lib/server/chat-service";
import { heavyChatSlots, integratorChatSlots } from "@/lib/request-slots";
import { withTransaction } from "@/lib/server/db";
import { ackAfterPersist, markGenerationJobFailed, recoverHeldResult, type GenerationJobRow } from "@/lib/server/generation-jobs";
import type { IntegratorChatResult } from "@/lib/server/integrator";
import { calculateUsagePricing } from "@/lib/server/pricing";
import { isPipeBreak } from "@/lib/integrator-usage";
import type { Locale } from "@/lib/locale-from-request";

export type ChatJobInput = {
  jobId: string;
  userId: string;
  conversationId: string;
  title: string;
  locale: Locale;
  providerId: string;
  modelId: string;
  depth: "fast" | "balanced" | "deep";
  conversationProviderId: string | null;
  conversationModelId: string | null;
  conversationDepth: "auto" | "fast" | "balanced" | "deep";
  agentId: string | null;
  prompt: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  images: string[];
  attachments: ChatAttachmentPayload[];
  preparedAttachments: Awaited<ReturnType<typeof import("@/lib/server/chat-service").prepareRequestAttachments>>;
  source: string;
  timezone?: string;
  billingBudgetTokens: number;
  integratorChatId: string;
  userMessageId: string;
  userContent: string;
  timeoutMs: number;
  releaseVideo?: () => void;
};

export async function executeChatJob(input: ChatJobInput): Promise<void> {
  const releaseIntegrator = (await integratorChatSlots.acquire(input.timeoutMs)) ?? (() => undefined);
  const heavy = isHeavyChatRequest(input.modelId, input.depth);
  const releaseHeavy = heavy ? ((await heavyChatSlots.acquire(input.timeoutMs)) ?? (() => undefined)) : () => undefined;
  try {
    const executed = await executeModelRequest({
      userId: input.userId,
      providerId: input.providerId,
      modelId: input.modelId,
      prompt: input.prompt,
      images: input.images,
      attachments: input.attachments,
      preparedAttachments: input.preparedAttachments,
      history: input.history,
      depth: input.depth,
      agentId: input.agentId,
      chatId: input.integratorChatId,
      source: input.source,
      timezone: input.timezone,
      billingBudgetTokens: input.billingBudgetTokens,
      locale: input.locale,
      timeoutMs: input.timeoutMs,
      requestId: input.jobId,
    });
    await persistChatJob(input, executed.result, executed.pricing, executed.agentName);
  } catch (error) {
    if (isPipeBreak(error) || (error instanceof Error && error.message === "WAREHOUSE_WAIT_TIMEOUT")) {
      const recovered = await recoverHeldResult<IntegratorChatResult>(input.jobId);
      if (recovered) {
        await persistChatFromHold(input, recovered);
        return;
      }
      console.error("chat_job_still_running", input.jobId, error instanceof Error ? error.message : "unknown");
      return;
    }
    await markGenerationJobFailed(input.jobId, error instanceof Error ? error.message : "failed");
    console.error("chat_job_failed", input.jobId, error instanceof Error ? error.message : "unknown");
  } finally {
    releaseHeavy();
    releaseIntegrator();
    input.releaseVideo?.();
  }
}

export async function settleChatJob(job: GenerationJobRow): Promise<void> {
  const recovered = await recoverHeldResult<IntegratorChatResult>(job.id);
  if (!recovered) return;
  const payload = job.payload;
  await persistChatFromHold({
    jobId: job.id,
    userId: job.user_id,
    conversationId: String(payload.conversationId ?? job.conversation_id ?? ""),
    title: String(payload.title ?? job.title ?? ""),
    locale: (typeof payload.locale === "string" ? payload.locale : "ru") as Locale,
    providerId: String(payload.providerId ?? ""),
    modelId: String(payload.modelId ?? ""),
    depth: (["fast", "balanced", "deep"].includes(String(payload.routeDepth))
      ? String(payload.routeDepth)
      : "balanced") as ChatJobInput["depth"],
    conversationProviderId: payload.conversationProviderId === null
      ? null
      : String(payload.conversationProviderId ?? payload.providerId ?? "") || null,
    conversationModelId: payload.conversationModelId === null
      ? null
      : String(payload.conversationModelId ?? payload.modelId ?? "") || null,
    conversationDepth: (["auto", "fast", "balanced", "deep"].includes(String(payload.conversationDepth))
      ? String(payload.conversationDepth)
      : "auto") as ChatJobInput["conversationDepth"],
    agentId: payload.agentId ? String(payload.agentId) : null,
    prompt: "",
    history: [],
    images: [],
    attachments: [],
    preparedAttachments: { promptSuffix: "", fileParts: [] },
    source: String(payload.source ?? "Genora.art"),
    billingBudgetTokens: 0,
    integratorChatId: String(payload.integratorChatId ?? ""),
    userMessageId: String(payload.userMessageId ?? ""),
    userContent: String(payload.userContent ?? ""),
    timeoutMs: 0,
  }, recovered);
}

async function persistChatFromHold(input: ChatJobInput, result: IntegratorChatResult): Promise<void> {
  for (const choice of result.choices) {
    if (choice?.message) choice.message.content = sanitizeAssistantContent(choice.message.content ?? "");
  }
  const pricing = await calculateUsagePricing(
    result.model || input.modelId,
    Number(result.usage.prompt_tokens) || 0,
    Number(result.usage.completion_tokens) || 0,
    result.usage.cost_usd,
  );
  if (!pricing) throw new Error("MODEL_NOT_AVAILABLE");
  await persistChatJob(input, result, pricing, "");
}

async function persistChatJob(
  input: ChatJobInput,
  result: IntegratorChatResult,
  pricing: NonNullable<Awaited<ReturnType<typeof calculateUsagePricing>>>,
  agentName: string,
): Promise<void> {
  const messageId = `msg-${input.jobId}`;
  const content = result.choices[0]?.message.content ?? "";
  const timestamp = new Date().toISOString();
  const payload = await withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [input.jobId]);
    const current = await client.query<{ status: string }>(`SELECT status FROM generation_jobs WHERE id=$1 FOR UPDATE`, [input.jobId]);
    if (current.rows[0]?.status !== "creating") return null;
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [input.userId]);
    await client.query(
      `INSERT INTO conversations(id,user_id,title,model_id,provider_id,depth_id,agent_id,updated_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,now())
       ON CONFLICT (id) DO UPDATE SET
         title=COALESCE(NULLIF(EXCLUDED.title,''), conversations.title),
         model_id=EXCLUDED.model_id,
         provider_id=EXCLUDED.provider_id,
         depth_id=EXCLUDED.depth_id,
         agent_id=EXCLUDED.agent_id,
         updated_at=now()
       WHERE conversations.user_id=$2`,
      [input.conversationId, input.userId, input.title.slice(0, 200), input.conversationModelId, input.conversationProviderId, input.conversationDepth, input.agentId],
    );
    if (input.userMessageId && input.userContent) {
      await client.query(
        `INSERT INTO messages(id,conversation_id,role,content,created_at)
         VALUES($1,$2,'user',$3,now()) ON CONFLICT (id) DO NOTHING`,
        [input.userMessageId, input.conversationId, input.userContent],
      );
    }
    await client.query(
      `INSERT INTO messages(id,conversation_id,role,content,model_id,token_count,thinking_ms,created_at)
       VALUES($1,$2,'assistant',$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING`,
      [messageId, input.conversationId, content, pricing.modelId, pricing.billedTokens, result.meta.latency_ms, timestamp],
    );
    const usage = await recordUsage({
      client,
      userId: input.userId,
      result,
      pricing,
      conversationId: input.conversationId,
      chatTitle: input.title.slice(0, 200),
      agentName,
      integratorChatId: input.integratorChatId,
      locale: input.locale,
    });
    const jobResult = {
      messageId,
      message: {
        id: messageId,
        role: "assistant",
        content,
        modelId: pricing.modelId,
        tokenCount: pricing.billedTokens,
        thinkingMs: result.meta.latency_ms,
        timestamp,
      },
      userMessage: input.userMessageId && input.userContent
        ? { id: input.userMessageId, role: "user", content: input.userContent, timestamp }
        : undefined,
      usage: { inputTokens: 0, outputTokens: pricing.billedTokens, billedTokens: pricing.billedTokens },
      route: { providerId: input.providerId, modelId: pricing.modelId, depth: input.depth },
      selection: {
        providerId: input.conversationProviderId,
        modelId: input.conversationModelId,
        depth: input.conversationDepth,
      },
      attachments: attachmentMeta(input.attachments),
      balanceTokens: usage.balanceTokens,
    };
    await client.query(
      `UPDATE generation_jobs SET status='ready', result=$2::jsonb, error=NULL, updated_at=now()
        WHERE id=$1 AND status='creating'`,
      [input.jobId, JSON.stringify(jobResult)],
    );
    return { balanceTokens: usage.balanceTokens };
  });
  if (!payload) return;
  await ackAfterPersist(input.jobId);
  if (payload.balanceTokens >= 0) await incrementWelcomeBonus(input.userId, "texts").catch(() => undefined);
}
