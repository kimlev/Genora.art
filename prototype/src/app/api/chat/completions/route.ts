import { after } from "next/server";
import { parseChatAttachments } from "@/lib/chat-attachments";
import {
  chatAttemptTimeoutMs,
  LARGE_CHAT_BODY_BYTES,
  VIDEO_CHAT_SLOT_WAIT_MS,
} from "@/lib/chat-request-policy";
import { withTransaction } from "@/lib/server/db";
import { MINIMUM_REQUEST_BALANCE_TOKENS, prepareRequestAttachments } from "@/lib/server/chat-service";
import { executeChatJob } from "@/lib/server/chat-jobs";
import { getGenerationJob, insertGenerationJob, markGenerationJobFailed, publicGenerationJob, updateGenerationJobDetails } from "@/lib/server/generation-jobs";
import { failGenerationRequest, registerGenerationRequest, updateGenerationRequestMetadata } from "@/lib/server/generation-request-registry";
import { resolveModelRoute } from "@/lib/server/auto-router";
import { videoChatSlots } from "@/lib/request-slots";
import { integratorProviderId } from "@/lib/provider-id";
import { isSameOrigin, jsonError, jsonTopUpError } from "@/lib/server/http";
import { topUpBalanceFromError } from "@/lib/server/paid-balance";
import { requireUser } from "@/lib/server/session";
import { requestLocale } from "@/lib/i18n/request-locale";
import { apiAppCopy } from "@/lib/i18n/copy/api-app";
import { usageHistoryCopy } from "@/lib/usage-history-copy";
import { chatModelAcceptsVideo, chatVideoCopy } from "@/lib/chat-video";
import { isPhotoPromptAgent, photoPromptCopy, photoPromptRequestContent } from "@/lib/photo-prompt-agent";
import { resolveVideoPromptInstruction } from "@/lib/server/system-agents";
import { isVideoPromptAgent, videoPromptDepthForModel, videoPromptModelAllowed, videoPromptProviderIdForModel } from "@/lib/video-prompt-agent";

export const runtime = "nodejs";
export const maxDuration = 3000;

type ChatBody = {
  conversationId?: unknown;
  title?: unknown;
  providerId?: unknown;
  modelId?: unknown;
  depth?: unknown;
  agentId?: unknown;
  content?: unknown;
  images?: unknown;
  attachments?: unknown;
  timezone?: unknown;
  locale?: unknown;
  userMessageId?: unknown;
};

export async function POST(request: Request) {
  let locale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError(apiAppCopy(locale).invalidOrigin, 403);
  const contentLength = Number(request.headers.get("content-length") || 0);
  const largeBody = Number.isFinite(contentLength) && contentLength > LARGE_CHAT_BODY_BYTES;
  let releaseVideo: (() => void) | undefined;
  let trackedJobId: string | null = null;
  let requestId: string | null = null;
  let workScheduled = false;
  try {
    const user = await requireUser();
    requestId = await registerGenerationRequest(user.id, "chat");
    if (largeBody) {
      releaseVideo = (await videoChatSlots.acquire(VIDEO_CHAT_SLOT_WAIT_MS)) ?? undefined;
      if (!releaseVideo) throw new Error("CHAT_TIMEOUT");
    }
    const body = await request.json().catch(() => null) as ChatBody | null;
    if (typeof body?.locale === "string") locale = await requestLocale(body.locale);
    const copy = usageHistoryCopy(locale);
    const conversationId = String(body?.conversationId ?? "").slice(0, 120);
    const agentId = body?.agentId ? String(body.agentId).slice(0, 120) : null;
    let providerId = integratorProviderId(String(body?.providerId ?? "").slice(0, 80));
    const modelId = String(body?.modelId ?? "").slice(0, 160);
    const content = String(body?.content ?? "").trim().slice(0, 100_000);
    const userMessageId = String(body?.userMessageId ?? "").slice(0, 160);
    const attachments = parseChatAttachments(body?.attachments, locale);
    const images = Array.isArray(body?.images) ? body.images.filter((value): value is string => typeof value === "string" && /^data:image\/(?:png|jpeg|webp);base64,/i.test(value) && value.length <= 8_000_000).slice(0, 4) : [];
    let depth = ["fast", "balanced", "deep", "auto"].includes(String(body?.depth)) ? String(body?.depth) as "fast"|"balanced"|"deep"|"auto" : "auto";
    await updateGenerationRequestMetadata(requestId, { provider: providerId, modelId, modelLabel: modelId, agent: agentId });
    if (isVideoPromptAgent(agentId)) {
      if (images.length || attachments.some((item) => item.kind !== "video")) throw new Error("CHAT_VIDEO_ONLY");
      if (!attachments.some((item) => item.kind === "video")) throw new Error("CHAT_VIDEO_REQUIRED");
      if (!videoPromptModelAllowed(modelId)) throw new Error("CHAT_INVALID_REQUEST");
      providerId = videoPromptProviderIdForModel(modelId);
      if (depth === "auto") depth = videoPromptDepthForModel(modelId);
    }
    if (isPhotoPromptAgent(agentId)) {
      if (attachments.some((item) => item.kind !== "image")) throw new Error("CHAT_PHOTOS_ONLY");
      if (!attachments.some((item) => item.kind === "image") && !images.length) throw new Error("CHAT_PHOTO_REQUIRED");
    }
    const conversationProviderId = providerId === "auto" ? null : providerId;
    const conversationModelId = modelId === "auto" ? null : modelId;
    const conversationDepth = depth;
    if (!conversationId || !providerId || !modelId || (!content && !attachments.length)) throw new Error("CHAT_INVALID_REQUEST");
    const title = (String(body?.title ?? content).trim() || copy.studyAttachment).slice(0, 200);
    const job = await insertGenerationJob({
      id: requestId,
      userId: user.id,
      kind: "chat",
      surface: "chat",
      conversationId,
      title,
      modelLabel: modelId,
      payload: { conversationId, title, locale, providerId, modelId, agentId, source: "Genora.art" },
    });
    trackedJobId = job.id;
    if (!releaseVideo && attachments.some((item) => item.kind === "video")) {
      releaseVideo = (await videoChatSlots.acquire(VIDEO_CHAT_SLOT_WAIT_MS)) ?? undefined;
      if (!releaseVideo) throw new Error("CHAT_TIMEOUT");
    }

    const preparedAttachments = await prepareRequestAttachments(attachments, locale);
    const setup = await withTransaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [user.id]);
      const balance = await client.query<{ balance_tokens: string }>("SELECT balance_tokens FROM users WHERE id=$1 FOR UPDATE", [user.id]);
      const balanceTokens = Number(balance.rows[0]?.balance_tokens ?? 0);
      if (balanceTokens < MINIMUM_REQUEST_BALANCE_TOKENS) throw new Error("INSUFFICIENT_BALANCE");
      const previous = await client.query<{ role: "user" | "assistant"; content: string }>(
        `SELECT m.role,m.content FROM messages m
         JOIN conversations c ON c.id=m.conversation_id WHERE c.id=$1 AND c.user_id=$2 AND m.role IN ('user','assistant') ORDER BY m.created_at DESC LIMIT 20`,
        [conversationId, user.id],
      );
      const route = await resolveModelRoute({ client, providerId, modelId, depth, prompt: content, locale });
      await client.query(
        `INSERT INTO conversations(id,user_id,title,model_id,provider_id,depth_id,agent_id,updated_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,now())
         ON CONFLICT (id) DO UPDATE SET title=COALESCE(NULLIF(EXCLUDED.title,''), conversations.title),
           model_id=EXCLUDED.model_id,provider_id=EXCLUDED.provider_id,depth_id=EXCLUDED.depth_id,agent_id=EXCLUDED.agent_id,updated_at=now()
         WHERE conversations.user_id=$2`,
        [conversationId, user.id, title, conversationModelId, conversationProviderId, conversationDepth, agentId],
      );
      if (userMessageId && content) {
        await client.query(
          `INSERT INTO messages(id,conversation_id,role,content,created_at) VALUES($1,$2,'user',$3,now()) ON CONFLICT (id) DO NOTHING`,
          [userMessageId, conversationId, content],
        );
      }
      return {
        route,
        history: previous.rows.reverse(),
        balanceTokens,
        integratorChatId: `ms-${user.id.slice(0, 8)}-${conversationId}`.slice(0, 120),
      };
    });

    const route = setup.route;
    if (!isVideoPromptAgent(agentId) && attachments.some((item) => item.kind === "video") && !chatModelAcceptsVideo(route.providerId, route.modelId)) {
      throw new Error("CHAT_VIDEO_UNSUPPORTED");
    }
    const attemptTimeout = chatAttemptTimeoutMs(route.modelId, route.depth);
    await updateGenerationJobDetails(job.id, {
      conversationId,
      title,
      modelLabel: route.modelId,
      payload: {
        providerId: route.providerId,
        modelId: route.modelId,
        routeDepth: route.depth,
        source: "Genora.art",
        integratorChatId: setup.integratorChatId,
        userMessageId,
        userContent: content,
        agentId,
        conversationProviderId,
        conversationModelId,
        conversationDepth,
      },
    });
    await updateGenerationRequestMetadata(requestId, { provider: route.providerId, modelId: route.modelId, modelLabel: route.modelId, agent: agentId });
    const heldVideo = releaseVideo;
    releaseVideo = undefined;
    const jobPrompt = isVideoPromptAgent(agentId)
      ? await resolveVideoPromptInstruction()
      : isPhotoPromptAgent(agentId)
        ? photoPromptRequestContent()
        : (content || copy.reviewAttachment);
    const chatJobInput = {
      jobId: job.id,
      userId: user.id,
      conversationId,
      title,
      locale,
      providerId: route.providerId,
      modelId: route.modelId,
      depth: route.depth,
      conversationProviderId,
      conversationModelId,
      conversationDepth,
      agentId,
      prompt: jobPrompt,
      history: isVideoPromptAgent(agentId) || isPhotoPromptAgent(agentId) ? [] : setup.history,
      images,
      attachments,
      preparedAttachments,
      source: "Genora.art",
      timezone: String(body?.timezone ?? "").slice(0, 80) || undefined,
      billingBudgetTokens: setup.balanceTokens,
      integratorChatId: setup.integratorChatId,
      userMessageId,
      userContent: content,
      timeoutMs: attemptTimeout,
      releaseVideo: heldVideo,
    } satisfies Parameters<typeof executeChatJob>[0];
    if (request.headers.get("x-genora-job-protocol") === "1") {
      after(() => executeChatJob(chatJobInput));
      workScheduled = true;
      return Response.json({ job: publicGenerationJob(job) }, { status: 202 });
    }
    // Совместимость с вкладками, открытыми до обновления фонового протокола.
    workScheduled = true;
    await executeChatJob(chatJobInput);
    const completed = await getGenerationJob(user.id, job.id);
    if (completed?.status === "ready" && completed.result) return Response.json(completed.result);
    if (completed?.status === "failed") {
      return jsonError(publicGenerationJob(completed).error || apiAppCopy(locale).modelNoAnswer, 502);
    }
    return Response.json({ job: publicGenerationJob(job) }, { status: 202 });
  } catch (error) {
    const errorCopy = apiAppCopy(locale);
    if (trackedJobId && !workScheduled) {
      await markGenerationJobFailed(trackedJobId, error instanceof Error ? error.message : "CHAT_REQUEST_FAILED").catch((trackingError) => {
        console.error("chat_request_tracking_failed", trackedJobId, trackingError instanceof Error ? trackingError.message : "unknown");
      });
    }
    if (requestId) await failGenerationRequest(requestId, error instanceof Error ? error.message : "CHAT_REQUEST_FAILED").catch(() => {});
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(errorCopy.authRequired, 401);
    if ((error as Error).message === "INSUFFICIENT_BALANCE" || (error as Error).message === "ANSWER_REQUIRES_TOP_UP") {
      return jsonTopUpError(errorCopy.topUpToSeeAnswer, topUpBalanceFromError(error));
    }
    if ((error as Error).message === "CHAT_BUSY" || (error as Error).message === "CHAT_TIMEOUT") {
      return jsonError(errorCopy.modelTimedOut, 504);
    }
    if ((error as Error).message === "CHAT_VIDEO_UNSUPPORTED") return jsonError(chatVideoCopy(locale).videoOnlyGemini);
    if ((error as Error).message === "CHAT_VIDEO_ONLY") return jsonError(chatVideoCopy(locale).videoOnlyGemini);
    if ((error as Error).message === "CHAT_VIDEO_REQUIRED") return jsonError(chatVideoCopy(locale).videoRequired);
    if ((error as Error).message === "CHAT_PHOTOS_ONLY") return jsonError(photoPromptCopy(locale).photosOnly);
    if ((error as Error).message === "CHAT_PHOTO_REQUIRED") return jsonError(photoPromptCopy(locale).photoRequired);
    if ((error as Error).message === "CHAT_INVALID_REQUEST") return jsonError(errorCopy.invalidRequest);
    if ((error as Error).message.startsWith("ATTACHMENT_INVALID:")) return jsonError((error as Error).message.slice("ATTACHMENT_INVALID:".length), 400);
    console.error("chat_completion_failed", error instanceof Error ? error.message : "unknown");
    return jsonError(errorCopy.modelNoAnswer, 502);
  } finally {
    releaseVideo?.();
  }
}
