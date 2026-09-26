import { randomUUID } from "node:crypto";
import { AGENT_DESCRIPTION_MAX, isAgentCategory } from "@/lib/agent-context";
import {
  AGENT_ARCHITECT_SYSTEM_PROMPT,
  AGENT_HELP_BILLED_TOKENS,
  AGENT_HELP_MODEL_ID,
  AGENT_HELP_PROVIDER_ID,
  buildArchitectUserMessage,
  extractGeneratedSystemPrompt,
} from "@/lib/agent-prompt-templates";
import { apiAppCopy } from "@/lib/i18n/copy/api-app";
import { requestLocale } from "@/lib/i18n/request-locale";
import { catalogPricing } from "@/lib/server/catalog";
import { executeModelRequest, MINIMUM_REQUEST_BALANCE_TOKENS, recordUsage } from "@/lib/server/chat-service";
import { withTransaction } from "@/lib/server/db";
import { isSameOrigin, jsonError, jsonTopUpError } from "@/lib/server/http";
import { topUpBalanceFromError } from "@/lib/server/paid-balance";
import { requireUser } from "@/lib/server/session";
import { incrementWelcomeBonus } from "@/lib/server/welcome-bonus";
import { usageHistoryCopy } from "@/lib/usage-history-copy";
import { completeGenerationRequest, failGenerationRequest, registerGenerationRequest, updateGenerationRequestMetadata } from "@/lib/server/generation-request-registry";

export const runtime = "nodejs";
export const maxDuration = 120;

type Body = { context?: unknown; description?: unknown; locale?: unknown };

export async function POST(request: Request) {
  let locale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError(apiAppCopy(locale).invalidOrigin, 403);
  let requestId: string | null = null;
  try {
    const user = await requireUser();
    requestId = await registerGenerationRequest(user.id, "chat");
    const body = await request.json().catch(() => null) as Body | null;
    if (typeof body?.locale === "string") locale = await requestLocale(body.locale);
    const copy = usageHistoryCopy(locale);
    const errors = apiAppCopy(locale);
    const context = isAgentCategory(body?.context) ? body.context : "writing";
    const description = String(body?.description ?? "").trim().slice(0, AGENT_DESCRIPTION_MAX);
    if (!description) {
      await failGenerationRequest(requestId, "AGENT_FIELDS_REQUIRED");
      return jsonError(errors.agentFieldsRequired);
    }
    await updateGenerationRequestMetadata(requestId, {
      provider: AGENT_HELP_PROVIDER_ID,
      modelId: AGENT_HELP_MODEL_ID,
      modelLabel: AGENT_HELP_MODEL_ID,
      agent: copy.agentHelp,
    });

    const contextLabel = {
      images: "images",
      video: "video",
      code: "code",
      writing: "writing",
      analysis: "analysis",
      marketing: "marketing",
      song: "song",
    }[context];

    const setup = await withTransaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [user.id]);
      const balance = await client.query<{ balance_tokens: string }>("SELECT balance_tokens FROM users WHERE id=$1 FOR UPDATE", [user.id]);
      const balanceTokens = Number(balance.rows[0]?.balance_tokens ?? 0);
      if (balanceTokens < MINIMUM_REQUEST_BALANCE_TOKENS) throw new Error("INSUFFICIENT_BALANCE");
      const catalog = await catalogPricing(AGENT_HELP_MODEL_ID);
      const multiplier = Math.max(Number(catalog?.billing_multiplier ?? 1), 1);
      return { balanceTokens: Math.round(balanceTokens * multiplier), helpId: `agent-help-${randomUUID()}` };
    });
    const executed = await executeModelRequest({
      userId: user.id,
      providerId: AGENT_HELP_PROVIDER_ID,
      modelId: AGENT_HELP_MODEL_ID,
      prompt: buildArchitectUserMessage(contextLabel, description, locale),
      depth: "balanced",
      chatId: setup.helpId.slice(0, 120),
      source: copy.agentHelp,
      billingBudgetTokens: setup.balanceTokens,
      locale,
      systemPrompt: AGENT_ARCHITECT_SYSTEM_PROMPT,
      agentName: copy.agentHelp,
    });
    const payload = await withTransaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [user.id]);
      await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [user.id]);
      const usage = await recordUsage({
        client,
        userId: user.id,
        result: executed.result,
        pricing: executed.pricing,
        chatTitle: copy.agentHelp,
        agentName: copy.agentHelp,
        integratorChatId: setup.helpId.slice(0, 120),
        usageId: `chat-${requestId}`,
        locale,
        note: copy.agentHelp,
        fixedBilledTokens: AGENT_HELP_BILLED_TOKENS,
      });
      return {
        prompt: extractGeneratedSystemPrompt(executed.result.choices[0]?.message.content ?? ""),
        billedTokens: AGENT_HELP_BILLED_TOKENS,
        balanceTokens: usage.balanceTokens,
      };
    });
    await completeGenerationRequest(requestId);
    if (payload.balanceTokens < 0) return jsonTopUpError(apiAppCopy(locale).topUpToSeeAnswer, payload.balanceTokens);
    if (!payload.prompt) throw new Error("EMPTY_PROMPT");
    await incrementWelcomeBonus(user.id, "texts").catch(() => undefined);
    return Response.json(payload);
  } catch (error) {
    if (requestId) await failGenerationRequest(requestId, (error as Error).message || "AGENT_PROMPT_HELP_FAILED").catch(() => undefined);
    const errors = apiAppCopy(locale);
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(errors.authRequired, 401);
    if ((error as Error).message === "INSUFFICIENT_BALANCE" || (error as Error).message === "ANSWER_REQUIRES_TOP_UP") {
      return jsonTopUpError(errors.topUpToSeeAnswer, topUpBalanceFromError(error));
    }
    console.error("agent_prompt_help_failed", error instanceof Error ? error.message : "unknown");
    return jsonError(errors.agentHelpFailed, 502);
  }
}
