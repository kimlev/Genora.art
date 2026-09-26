import { after } from "next/server";
import { findImageAgent, renderImageAgentPrompt } from "@/lib/server/image-agents";
import { quoteImage } from "@/lib/server/generation-quote";
import { integratorImageCatalog } from "@/lib/server/integrator";
import { query, withTransaction } from "@/lib/server/db";
import { executeImageJob } from "@/lib/server/image-jobs";
import { insertGenerationJob, markGenerationJobFailed, publicGenerationJob, reserveGenerationJobTokens, updateGenerationJobDetails } from "@/lib/server/generation-jobs";
import { failGenerationRequest, registerGenerationRequest, updateGenerationRequestMetadata } from "@/lib/server/generation-request-registry";
import { topUpBalanceFromError } from "@/lib/server/paid-balance";
import { isSameOrigin, jsonError, jsonTopUpError } from "@/lib/server/http";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { requireUser } from "@/lib/server/session";
import { requestLocale } from "@/lib/i18n/request-locale";
import { apiAppCopy } from "@/lib/i18n/copy/api-app";
import { characterUiCopy } from "@/lib/i18n/copy/characters";
import { usageHistoryCopy } from "@/lib/usage-history-copy";
import { characterReferenceDataUrls } from "@/lib/server/characters";

export const runtime = "nodejs";
export const maxDuration = 720;

type GenerationBody = {
  provider?: unknown;
  model?: unknown;
  prompt?: unknown;
  size?: unknown;
  format?: unknown;
  style?: unknown;
  reasoning?: unknown;
  inputImage?: unknown;
  inputImages?: unknown;
  sourceImageCount?: unknown;
  imageAgentId?: unknown;
  consent?: unknown;
  conversationId?: unknown;
  count?: unknown;
  locale?: unknown;
  characterId?: unknown;
  characterSlot?: unknown;
};

type ConversationRow = { id: string; title: string; updated_at: Date };
type GenerationRow = {
  conversation_id: string;
  request_id: string;
  provider: string;
  model_id: string;
  model_label: string;
  prompt: string;
  size: string;
  format: string;
  style: string;
  reasoning: string | null;
  asset_ids: string[];
  billed_tokens: string;
  created_at: Date;
};
type VideoHistoryRow = {
  conversation_id: string;
  request_id: string;
  provider: string;
  model_id: string;
  model_label: string;
  prompt: string;
  duration_sec: number;
  resolution: string;
  aspect_ratio: string;
  sound: string;
  style: string;
  asset_ids: string[];
  billed_tokens: string;
  created_at: Date;
};

function titleFromPrompt(prompt: string, fallback: string): string {
  return (prompt.replace(/[\n\r]+/g, " ").trim().slice(0, 80) || fallback).trim();
}

function publicGeneration(row: GenerationRow) {
  return {
    conversationId: row.conversation_id,
    requestId: row.request_id,
    provider: row.provider,
    modelId: row.model_id,
    modelLabel: row.model_label,
    prompt: row.prompt,
    size: row.size,
    format: row.format,
    style: row.style,
    reasoning: row.reasoning,
    billedTokens: Number(row.billed_tokens),
    createdAt: row.created_at.toISOString(),
    images: row.asset_ids.map((id) => ({ id, url: `/api/images/assets/${id}`, previewUrl: `/api/images/assets/${id}?variant=preview` })),
    kind: "photo" as const,
  };
}

function publicVideoHistory(row: VideoHistoryRow) {
  return {
    conversationId: row.conversation_id,
    requestId: row.request_id,
    provider: row.provider,
    modelId: row.model_id,
    modelLabel: row.model_label,
    prompt: row.prompt,
    size: row.resolution,
    format: row.aspect_ratio,
    style: row.style,
    reasoning: null,
    billedTokens: Number(row.billed_tokens),
    createdAt: row.created_at.toISOString(),
    images: row.asset_ids.map((id) => ({ id, url: `/api/video/assets/${id}`, previewUrl: `/api/video/assets/${id}?variant=preview` })),
    kind: "video" as const,
    durationSec: row.duration_sec,
    sound: row.sound === "on" ? "on" as const : "off" as const,
  };
}

export async function GET(request: Request) {
  const appCopy = apiAppCopy(await requestLocale());
  try {
    const user = await requireUser();
    const archived = new URL(request.url).searchParams.get("archived") === "1";
    const conversations = archived
      ? await query<ConversationRow>(`SELECT DISTINCT c.id,c.title,c.updated_at
          FROM image_conversations c
          WHERE c.user_id=$1 AND (
            c.deleted_at IS NOT NULL
            OR EXISTS (SELECT 1 FROM image_generations g WHERE g.conversation_id=c.id AND g.deleted_at IS NOT NULL)
            OR EXISTS (SELECT 1 FROM video_generations v WHERE v.conversation_id=c.id AND v.deleted_at IS NOT NULL)
          )
          ORDER BY c.updated_at DESC LIMIT 100`, [user.id])
      : await query<ConversationRow>(`SELECT id,title,updated_at
          FROM image_conversations WHERE user_id=$1 AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 100`, [user.id]);
    const generations = archived
      ? await query<GenerationRow>(`SELECT g.conversation_id,g.request_id,g.provider,g.model_id,g.model_label,g.prompt,g.size,g.format,g.style,g.reasoning,g.asset_ids,g.billed_tokens,g.created_at
          FROM image_generations g JOIN image_conversations c ON c.id=g.conversation_id
          WHERE c.user_id=$1 AND g.deleted_at IS NOT NULL ORDER BY g.created_at DESC LIMIT 500`, [user.id])
      : await query<GenerationRow>(`SELECT g.conversation_id,g.request_id,g.provider,g.model_id,g.model_label,g.prompt,g.size,g.format,g.style,g.reasoning,g.asset_ids,g.billed_tokens,g.created_at
          FROM image_generations g JOIN image_conversations c ON c.id=g.conversation_id
          WHERE c.user_id=$1 AND c.deleted_at IS NULL AND g.deleted_at IS NULL ORDER BY g.created_at DESC LIMIT 500`, [user.id]);
    const videos = archived
      ? await query<VideoHistoryRow>(`SELECT v.conversation_id,v.request_id,v.provider,v.model_id,v.model_label,v.prompt,v.duration_sec,v.resolution,v.aspect_ratio,v.sound,v.style,v.asset_ids,v.billed_tokens,v.created_at
          FROM video_generations v JOIN image_conversations c ON c.id=v.conversation_id
          WHERE c.user_id=$1 AND v.deleted_at IS NOT NULL ORDER BY v.created_at DESC LIMIT 500`, [user.id])
      : await query<VideoHistoryRow>(`SELECT v.conversation_id,v.request_id,v.provider,v.model_id,v.model_label,v.prompt,v.duration_sec,v.resolution,v.aspect_ratio,v.sound,v.style,v.asset_ids,v.billed_tokens,v.created_at
          FROM video_generations v JOIN image_conversations c ON c.id=v.conversation_id
          WHERE c.user_id=$1 AND c.deleted_at IS NULL AND v.deleted_at IS NULL ORDER BY v.created_at DESC LIMIT 500`, [user.id]);
    const byConversation = new Map<string, Array<ReturnType<typeof publicGeneration> | ReturnType<typeof publicVideoHistory>>>();
    for (const generation of generations) {
      const items = byConversation.get(generation.conversation_id) ?? [];
      items.push(publicGeneration(generation));
      byConversation.set(generation.conversation_id, items);
    }
    for (const generation of videos) {
      const items = byConversation.get(generation.conversation_id) ?? [];
      items.push(publicVideoHistory(generation));
      byConversation.set(generation.conversation_id, items);
    }
    const titles = await query<{ kind: string; asset_id: string; title: string }>(
      "SELECT kind,asset_id,title FROM media_titles WHERE user_id=$1 AND asset_id=ANY($2::text[])",
      [user.id, [...generations, ...videos].flatMap((generation) => generation.asset_ids)],
    );
    const titlesByAsset = new Map(titles.map((row) => [`${row.kind}:${row.asset_id}`, row.title]));
    for (const items of byConversation.values()) {
      for (const item of items) {
        item.images = item.images.map((image) => ({ ...image, title: titlesByAsset.get(`${item.kind}:${image.id}`) ?? "" }));
      }
      items.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    }
    return Response.json({
      conversations: conversations.map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        updatedAt: conversation.updated_at.toISOString(),
        generations: byConversation.get(conversation.id) ?? [],
      })),
    });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(appCopy.authRequired, 401);
    console.error("image_history_failed", error instanceof Error ? error.message : "unknown");
    return jsonError(appCopy.imagesHistoryFailed, 500);
  }
}

export async function POST(request: Request) {
  let locale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError(apiAppCopy(locale).invalidOrigin, 403);
  let trackedJobId: string | null = null;
  let requestId: string | null = null;
  let workScheduled = false;
  try {
    const user = await requireUser();
    requestId = await registerGenerationRequest(user.id, "image");
    const body = await request.json().catch(() => null) as GenerationBody | null;
    if (typeof body?.locale === "string") locale = await requestLocale(body.locale);
    const copy = usageHistoryCopy(locale);
    const allowed = await consumeRateLimit({ scope: "image-generation", identifier: user.id, limit: 30, windowSeconds: 60 * 60 });
    if (!allowed) throw new Error("IMAGE_BUSY");

    const provider = String(body?.provider ?? "").slice(0, 80);
    const model = String(body?.model ?? "").slice(0, 160);
    const prompt = String(body?.prompt ?? "").trim().slice(0, 16_000);
    const size = String(body?.size ?? "").slice(0, 30);
    const format = String(body?.format ?? "").slice(0, 30);
    const style = String(body?.style ?? "auto").slice(0, 50);
    const reasoning = String(body?.reasoning ?? "").slice(0, 50) || undefined;
    const imageAgentId = String(body?.imageAgentId ?? "").slice(0, 80) || undefined;
    const characterId = String(body?.characterId ?? "").slice(0, 80) || undefined;
    const characterSlot = Math.max(0, Math.min(3, Math.trunc(Number(body?.characterSlot) || 0)));
    const requestedConversationId = String(body?.conversationId ?? "").slice(0, 80);
    await updateGenerationRequestMetadata(requestId, { provider, modelId: model, modelLabel: model, agent: imageAgentId });
    const count = ([1, 2, 4].includes(Number(body?.count)) ? Number(body?.count) : 1) as 1 | 2 | 4;
    const asInputImage = (value: unknown) => (
      typeof value === "string"
      && /^data:image\/(?:png|jpeg|webp);base64,/i.test(value)
      && value.length <= 28_000_000
        ? value
        : undefined
    );
    let inputImages = (Array.isArray(body?.inputImages) ? body.inputImages : [])
      .map(asInputImage)
      .filter((item): item is string => Boolean(item))
      .slice(0, 4);
    let inputImage = inputImages[0] ?? asInputImage(body?.inputImage);
    if (inputImage && !inputImages.length) inputImages.push(inputImage);
    let sourceImageCount = Math.max(0, Math.min(4, inputImages.length || Number(body?.sourceImageCount ?? (inputImage ? 1 : 0)) || 0));
    if (!provider || !model || (!prompt && !imageAgentId) || !size || !format) throw new Error("IMAGE_PARAMS_INVALID");
    if (requestedConversationId && !/^[0-9a-f-]{36}$/i.test(requestedConversationId)) throw new Error("IMAGE_CONVERSATION_ID_INVALID");

    const trackedJob = await insertGenerationJob({
      id: requestId,
      userId: user.id,
      kind: "image",
      surface: "images",
      conversationId: requestedConversationId || null,
      title: prompt || imageAgentId || copy.imagePromptFallback,
      modelLabel: model,
      deferReservation: true,
      payload: { locale, provider, model, imageAgentId: imageAgentId ?? null, prompt, size, format, style, reasoning, count },
    });
    trackedJobId = trackedJob.id;

    const catalog = await integratorImageCatalog();
    const catalogModel = catalog.models.find((item) => item.provider === provider && item.id === model);
    if (!catalogModel) throw new Error("PROVIDER_NOT_AVAILABLE");
    if (characterId) {
      if (!/^[0-9a-f-]{36}$/i.test(characterId)) throw new Error("CHARACTER_NOT_FOUND");
      if (!catalogModel.input_image.supported || (catalogModel.max_reference_images ?? 0) < 1) throw new Error("CHARACTER_MODEL_UNSUPPORTED");
      const characterReferences = await characterReferenceDataUrls(user.id, characterId);
      inputImages.splice(Math.min(characterSlot, inputImages.length), 0, ...characterReferences);
      inputImages = inputImages.slice(0, Math.max(1, catalogModel.max_reference_images ?? 1));
      inputImage = inputImages[0];
      sourceImageCount = inputImages.length;
    }
    const setup = await withTransaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [user.id]);
      const providerRow = await client.query<{ billing_multiplier: string }>("SELECT billing_multiplier FROM ai_providers WHERE id=$1 AND active=true", [provider]);
      const modelRow = await client.query<{ markup_multiplier: string }>("SELECT markup_multiplier FROM ai_models WHERE id=$1 AND active=true", [model]);
      if (!providerRow.rows[0]) throw new Error("PROVIDER_NOT_AVAILABLE");
      const imageAgent = imageAgentId ? await findImageAgent(imageAgentId, client, user.id) : null;
      if (imageAgentId && !imageAgent) throw new Error("IMAGE_AGENT_NOT_FOUND");
      if (imageAgent && (sourceImageCount < imageAgent.inputMin || sourceImageCount > imageAgent.inputMax)) throw new Error(`IMAGE_AGENT_INPUT_COUNT:${imageAgent.inputMin}:${imageAgent.inputMax}`);
      if (imageAgent?.consentRequired && body?.consent !== true) throw new Error("CONSENT_REQUIRED");
      let conversation: ConversationRow | undefined;
      if (requestedConversationId) {
        const owned = await client.query<ConversationRow>("SELECT id,title,updated_at FROM image_conversations WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL FOR UPDATE", [requestedConversationId, user.id]);
        conversation = owned.rows[0];
        if (!conversation) throw new Error("IMAGE_CONVERSATION_NOT_FOUND");
      } else {
        const created = await client.query<ConversationRow>(`INSERT INTO image_conversations(user_id,title)
          VALUES($1,$2) RETURNING id,title,updated_at`, [user.id, titleFromPrompt(prompt, imageAgent?.name ?? copy.newImageConversation)]);
        conversation = created.rows[0];
      }
      return {
        conversation,
        multiplier: Number(modelRow.rows[0]?.markup_multiplier ?? providerRow.rows[0].billing_multiplier),
        imageAgent,
        storedPrompt: prompt || imageAgent?.name || copy.imagePromptFallback,
        finalPrompt: imageAgent ? renderImageAgentPrompt(imageAgent, prompt, format, { size, quality: reasoning, style, photoCount: sourceImageCount }) : prompt,
      };
    });

    await updateGenerationJobDetails(trackedJob.id, {
      conversationId: setup.conversation.id,
      title: setup.storedPrompt,
      modelLabel: catalogModel.label,
      payload: {
        conversationId: setup.conversation.id,
        conversationTitle: setup.conversation.title,
        multiplier: setup.multiplier,
        prompt: setup.finalPrompt,
        storedPrompt: setup.storedPrompt,
        imageAgentId: setup.imageAgent?.id ?? null,
        imageAgentName: setup.imageAgent?.name,
        sourceImageCount,
      },
    });
    await updateGenerationRequestMetadata(requestId, { provider, modelId: model, modelLabel: catalogModel.label, agent: setup.imageAgent?.name ?? imageAgentId });
    const balanceTokens = await reserveGenerationJobTokens(trackedJob.id, user.id, quoteImage(catalogModel, size, reasoning, count, setup.multiplier));
    const job = { ...trackedJob, conversation_id: setup.conversation.id, model_label: catalogModel.label, balanceTokens };
    after(() => executeImageJob({
      jobId: job.id,
      userId: user.id,
      conversationId: setup.conversation.id,
      conversationTitle: setup.conversation.title,
      locale,
      multiplier: setup.multiplier,
      provider,
      model,
      prompt: setup.finalPrompt,
      storedPrompt: setup.storedPrompt,
      size,
      format,
      style,
      reasoning,
      inputImage,
      inputImages,
      count,
      imageAgentId: setup.imageAgent?.id ?? null,
      imageAgentName: setup.imageAgent?.name,
      sourceImageCount,
    }));
    workScheduled = true;
    return Response.json({
      job: publicGenerationJob(job),
      balanceTokens: job.balanceTokens,
      conversation: { id: setup.conversation.id, title: setup.conversation.title, updatedAt: setup.conversation.updated_at.toISOString() },
    }, { status: 202 });
  } catch (error) {
    const message = (error as Error).message;
    const errorCopy = apiAppCopy(locale);
    if (trackedJobId && !workScheduled) {
      await markGenerationJobFailed(trackedJobId, message || "IMAGE_REQUEST_FAILED").catch((trackingError) => {
        console.error("image_request_tracking_failed", trackedJobId, trackingError instanceof Error ? trackingError.message : "unknown");
      });
    }
    if (requestId) await failGenerationRequest(requestId, message || "IMAGE_REQUEST_FAILED").catch(() => {});
    if (message === "UNAUTHORIZED") return jsonError(errorCopy.authRequired, 401);
    if (message === "INSUFFICIENT_BALANCE" || message === "ANSWER_REQUIRES_TOP_UP") {
      return jsonTopUpError(errorCopy.topUpToSeeAnswer, topUpBalanceFromError(error));
    }
    if (message === "IMAGE_BUSY") return jsonError(errorCopy.imageRateLimited, 429);
    if (message === "IMAGE_PARAMS_INVALID" || message === "IMAGE_CONVERSATION_ID_INVALID") return jsonError(message === "IMAGE_PARAMS_INVALID" ? errorCopy.imageParamsRequired : errorCopy.conversationInvalid, 400);
    if (message === "PROVIDER_NOT_AVAILABLE") return jsonError(errorCopy.imageProviderUnavailable, 409);
    if (message === "IMAGE_AGENT_NOT_FOUND") return jsonError(errorCopy.imageAgentUnavailable, 409);
    if (message === "CHARACTER_NOT_FOUND" || message === "CHARACTER_MODEL_UNSUPPORTED") return jsonError(characterUiCopy(locale).noReady, 400);
    if (message.startsWith("IMAGE_AGENT_INPUT_COUNT")) {
      const [, min, max] = message.split(":");
      return jsonError(errorCopy.imageAgentInputCount(Number(min), Number(max)), 400);
    }
    if (message === "CONSENT_REQUIRED") return jsonError(errorCopy.imageConsentRequired, 400);
    if (message === "IMAGE_CONVERSATION_NOT_FOUND") return jsonError(errorCopy.imageConversationNotFound, 404);
    // IntegratorAI отдаёт эту причину только текстом и только по-русски, кода ошибки для неё нет
    if (/не поддерживает генерацию фото-в-фото|не поддерживает преобразование/i.test(message)) {
      return jsonError(errorCopy.imageEditUnsupported, 400);
    }
    console.error("image_generation_failed", error instanceof Error ? error.message : "unknown");
    return jsonError(errorCopy.imageGenerationFailed, 502);
  }
}
