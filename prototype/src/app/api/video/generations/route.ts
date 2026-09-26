import { after } from "next/server";
import {
  dataUrlDecodedBytes,
  motionControlClipBounds,
  motionControlClipIssue,
  motionControlRequestDuration,
  nearestVideoDuration,
  studioIntegratorMode,
  videoDbId,
  videoUserPromptHardChars,
  videoCharacterRightsRequired,
  videoModelSupportsCharacter,
  videoSlotCount,
  videoV2vAcceptsPhotos,
  type StudioVideoMode,
  type VideoCatalogModel,
  type VideoSound,
} from "@/lib/catalog/video-studio";
import { videoStyleById, videoStylePromptExtraChars } from "@/lib/i18n/copy/video-styles";
import { quoteVideo } from "@/lib/server/generation-quote";
import { withTransaction } from "@/lib/server/db";
import { topUpBalanceFromError } from "@/lib/server/paid-balance";
import { isSameOrigin, jsonError, jsonTopUpError } from "@/lib/server/http";
import { integratorVideoCatalogFull } from "@/lib/server/integrator";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { requireUser } from "@/lib/server/session";
import { executeVideoJob, insertVideoJob, markVideoJobFailed, publicVideoJob } from "@/lib/server/video-jobs";
import { failGenerationRequest, registerGenerationRequest, updateGenerationRequestMetadata } from "@/lib/server/generation-request-registry";
import { requestLocale } from "@/lib/i18n/request-locale";
import { apiAppCopy } from "@/lib/i18n/copy/api-app";
import { usageHistoryCopy } from "@/lib/usage-history-copy";
import { characterUiCopy } from "@/lib/i18n/copy/characters";
import { videoCharacterRightsCopy, videoReferenceMixUnsupportedCopy, videoStudioUiCopy } from "@/lib/i18n/copy/video-studio-ui-copy";
import { promptBlockedCopy } from "@/lib/i18n/copy/prompt-blocked";
import { characterKindForUser, characterReferenceDataUrls } from "@/lib/server/characters";
import { resolveVideoAgentDefinition, videoAgentReferenceDataUrls } from "@/lib/server/system-agents";
import { videoAgentDefaults, videoAgentMinUserReferences, videoAgentNeedsUserPrompt, videoAgentRequiresMotionControlInputs } from "@/lib/video-agent-catalog";

export const runtime = "nodejs";
export const maxDuration = 1800;

const IMAGE_DATA = /^data:image\/(?:png|jpeg|jpg|webp);base64,/i;
const VIDEO_DATA = /^data:video\/(?:mp4|quicktime|webm);base64,/i;
const MAX_IMAGE = 16_000_000;
const MAX_VIDEO = 24_000_000;

function titleFromPrompt(prompt: string, fallback: string): string {
  return (prompt.replace(/[\n\r]+/g, " ").trim().slice(0, 80) || fallback).trim();
}

function asDataUrl(value: unknown, kind: "image" | "video") {
  if (typeof value !== "string") return undefined;
  const ok = kind === "image" ? IMAGE_DATA.test(value) && value.length <= MAX_IMAGE : VIDEO_DATA.test(value) && value.length <= MAX_VIDEO;
  return ok ? value : undefined;
}

function asList(value: unknown, kind: "image" | "video") {
  return (Array.isArray(value) ? value : []).map((item) => asDataUrl(item, kind)).filter((item): item is string => Boolean(item));
}

export async function POST(request: Request) {
  let locale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError(apiAppCopy(locale).invalidOrigin, 403);
  let trackedJobId: string | null = null;
  let requestId: string | null = null;
  let workScheduled = false;
  try {
    const user = await requireUser();
    requestId = await registerGenerationRequest(user.id, "video");
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (typeof body?.locale === "string") locale = await requestLocale(body.locale);
    const copy = usageHistoryCopy(locale);
    const allowed = await consumeRateLimit({ scope: "video-generation", identifier: user.id, limit: 20, windowSeconds: 60 * 60 });
    if (!allowed) throw new Error("IMAGE_BUSY");

    const provider = String(body?.provider ?? "").slice(0, 80);
    const model = String(body?.model ?? "").slice(0, 160);
    const rawPrompt = String(body?.prompt ?? "").trim();
    const uiMode = (["t2v", "animate", "i2v", "v2v"].includes(String(body?.mode)) ? String(body?.mode) : "t2v") as StudioVideoMode;
    const wantedDuration = Math.max(4, Math.min(30, Math.round(Number(body?.duration) || 8)));
    const resolution = String(body?.resolution ?? body?.size ?? "").slice(0, 30);
    const aspectRatio = String(body?.aspectRatio ?? body?.format ?? "").slice(0, 30);
    const sound = (body?.sound === "on" ? "on" : "off") as VideoSound;
    const style = String(body?.style ?? "auto").slice(0, 50);
    const characterId = String(body?.characterId ?? "").slice(0, 80) || undefined;
    const agentId = String(body?.agentId ?? "").slice(0, 80) || undefined;
    const characterSlot = Math.max(0, Math.min(3, Math.trunc(Number(body?.characterSlot) || 0)));
    await updateGenerationRequestMetadata(requestId, { provider, modelId: model, modelLabel: model, agent: agentId });
    if (style !== "auto" && !videoStyleById(locale, style)) throw new Error("VIDEO_PARAMS_INVALID");
    const prompt = agentId === "angel" ? "" : rawPrompt;
    const requestedConversationId = String(body?.conversationId ?? "").slice(0, 80);
    let firstFrame = asDataUrl(body?.firstFrame ?? body?.inputImage, "image");
    let lastFrame = asDataUrl(body?.lastFrame, "image");
    let references = asList(body?.references, "image");
    let videos = asList(body?.videos, "video");
    if (requestedConversationId && !/^[0-9a-f-]{36}$/i.test(requestedConversationId)) throw new Error("IMAGE_CONVERSATION_ID_INVALID");
    const conversation = await withTransaction(async (client) => {
      if (requestedConversationId) {
        const owned = await client.query<{ id: string; title: string; updated_at: Date }>(
          "SELECT id,title,updated_at FROM image_conversations WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL FOR UPDATE",
          [requestedConversationId, user.id],
        );
        if (!owned.rows[0]) throw new Error("IMAGE_CONVERSATION_NOT_FOUND");
        return owned.rows[0];
      }
      const created = await client.query<{ id: string; title: string; updated_at: Date }>(
        `INSERT INTO image_conversations(user_id,title) VALUES($1,$2) RETURNING id,title,updated_at`,
        [user.id, titleFromPrompt(rawPrompt, agentId ?? copy.newImageConversation)],
      );
      return created.rows[0];
    });
    const userReferenceCount = Number(Boolean(firstFrame)) + Number(Boolean(lastFrame)) + references.length + Number(Boolean(characterId));
    if (!provider || !model || (!prompt && videoAgentNeedsUserPrompt(agentId ?? "")) || !resolution || !aspectRatio) throw new Error("VIDEO_PARAMS_INVALID");
    if (userReferenceCount < videoAgentMinUserReferences(agentId ?? "")) throw new Error("VIDEO_INPUT_REQUIRED");
    const requiresMotionControl = videoAgentRequiresMotionControlInputs(agentId ?? "");
    const pinnedDefaults = requiresMotionControl ? videoAgentDefaults(agentId ?? "") : null;
    if (requiresMotionControl && (!pinnedDefaults || provider !== pinnedDefaults.providerId || uiMode !== pinnedDefaults.videoMode)) {
      throw new Error("VIDEO_AGENT_INVALID");
    }
    if (requiresMotionControl && (!firstFrame || lastFrame || references.length || characterId || videos.length)) {
      throw new Error("VIDEO_INPUT_REQUIRED");
    }
    const catalog = await integratorVideoCatalogFull();
    const catalogModel = catalog.models.find((item) => item.provider === provider && item.id === model) as VideoCatalogModel | undefined;
    if (!catalogModel) throw new Error("PROVIDER_NOT_AVAILABLE");
    await updateGenerationRequestMetadata(requestId, { provider, modelId: model, modelLabel: catalogModel.label, agent: agentId });
    const videoAgent = agentId ? await resolveVideoAgentDefinition(agentId) : null;
    if (agentId && (!videoAgent || videoAgent.videoMode !== uiMode)) throw new Error("VIDEO_AGENT_INVALID");
    if (videoAgent) {
      const configured = await videoAgentReferenceDataUrls(videoAgent);
      for (const item of configured) {
        if (item.kind === "video") { videos = [...videos, item.url]; continue; }
        if (item.role === "first-frame" && !firstFrame) firstFrame = item.url;
        else if (item.role === "last-frame" && !lastFrame) lastFrame = item.url;
        else references = [...references, item.url];
      }
    }
    const mode = requiresMotionControl && catalogModel.modes?.includes("motion-control")
      ? "motion-control"
      : studioIntegratorMode(uiMode, catalogModel);
    if (requiresMotionControl && (
      !firstFrame
      || videos.length !== 1
      || catalogModel.provider !== pinnedDefaults?.providerId
      || mode !== "motion-control"
    )) throw new Error("VIDEO_INPUT_REQUIRED");
    const combinedPrompt = videoAgent?.systemPrompt.trim()
      ? prompt
        ? `${videoAgent.systemPrompt.trim()}\n\nUser request: ${prompt}`
        : videoAgent.systemPrompt.trim()
      : prompt;
    const promptForTransfer = combinedPrompt.slice(0, videoUserPromptHardChars(catalogModel, videoStylePromptExtraChars(locale, style)));
    if (!mode && uiMode === "v2v" && catalogModel.provider === "alibaba" && catalogModel.id === "wan-3.0") {
      throw new Error("VIDEO_REFERENCE_MIX_UNSUPPORTED");
    }
    if (!mode) throw new Error("VIDEO_MODE_UNSUPPORTED");
    if (characterId) {
      if (!/^[0-9a-f-]{36}$/i.test(characterId) || mode !== "ref-to-video" || !videoModelSupportsCharacter(catalogModel)) {
        throw new Error("CHARACTER_MODEL_UNSUPPORTED");
      }
      const characterKind = await characterKindForUser(user.id, characterId);
      if (characterKind === "personal" && videoCharacterRightsRequired(catalogModel)) throw new Error("CHARACTER_RIGHTS_CONFIRMATION_REQUIRED");
      const characterReferences = await characterReferenceDataUrls(user.id, characterId);
      references.splice(Math.min(characterSlot, references.length), 0, ...characterReferences);
      references = references.slice(0, Math.max(1, catalogModel.max_reference_images ?? 1));
    }
    let duration = nearestVideoDuration(catalogModel.durations ?? [], wantedDuration);
    if (!(catalogModel.resolutions ?? []).includes(resolution)) throw new Error("VIDEO_PARAMS_INVALID");
    if (!(catalogModel.aspect_ratios ?? []).includes(aspectRatio)) throw new Error("VIDEO_PARAMS_INVALID");
    const slots = videoSlotCount(uiMode, catalogModel);
    if (mode === "image-to-video" && !firstFrame) throw new Error("VIDEO_INPUT_REQUIRED");
    if (mode === "ref-to-video" && !references.length) throw new Error("VIDEO_INPUT_REQUIRED");
    if (mode === "video-to-video" && !videos.length) throw new Error("VIDEO_INPUT_REQUIRED");
    if (mode === "video-to-video" && references.length && !videoV2vAcceptsPhotos(catalogModel)) throw new Error("VIDEO_REFERENCE_MIX_UNSUPPORTED");
    if (mode === "motion-control" && (!videos.length || (!firstFrame && !references.length))) throw new Error("VIDEO_INPUT_REQUIRED");
    if (slots > 0 && mode === "image-to-video" && lastFrame && slots < 2) throw new Error("VIDEO_INPUT_REQUIRED");
    if (mode === "motion-control") {
      const clipSeconds = Number(body?.clipDuration ?? pinnedDefaults?.videoSettings.duration);
      const videoBytes = dataUrlDecodedBytes(videos[0] ?? "");
      const issue = motionControlClipIssue(catalogModel, videoBytes, clipSeconds);
      if (issue) {
        const bounds = motionControlClipBounds(catalogModel);
        const videoCopy = videoStudioUiCopy(locale);
        const message = issue === "size"
          ? `${videoCopy.fileTooBig}\n${videoCopy.fileLimit(Math.floor(bounds.maxFileBytes / 1_000_000))}`
          : issue === "duration-short"
            ? videoCopy.clipTooShort(bounds.min)
            : issue === "duration-long"
              ? videoCopy.clipTooLong(bounds.max)
              : videoCopy.clipUnreadable;
        throw new Error(`VIDEO_CLIP_INVALID:${message}`);
      }
      const billed = motionControlRequestDuration(catalogModel, clipSeconds, videoBytes);
      if (billed == null) throw new Error("VIDEO_PARAMS_INVALID");
      duration = billed;
    }

    const setup = await withTransaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [user.id]);
      const providerRow = await client.query<{ billing_multiplier: string }>("SELECT billing_multiplier FROM ai_providers WHERE id=$1 AND active=true", [provider]);
      const modelRow = await client.query<{ markup_multiplier: string }>("SELECT markup_multiplier FROM ai_models WHERE id=$1 AND active=true", [videoDbId(provider, model)]);
      if (!providerRow.rows[0]) throw new Error("PROVIDER_NOT_AVAILABLE");
      return {
        multiplier: Number(modelRow.rows[0]?.markup_multiplier ?? providerRow.rows[0].billing_multiplier),
      };
    });

    const job = await insertVideoJob({
      id: requestId,
      reservationTokens: quoteVideo(catalogModel, resolution, sound, duration, setup.multiplier),
      userId: user.id,
      conversationId: conversation.id,
      provider,
      modelId: model,
      modelLabel: catalogModel.label,
      prompt,
      mode,
      durationSec: duration,
      resolution,
      aspectRatio,
      sound,
      style,
      multiplier: setup.multiplier,
      locale,
      requestId,
      agentId: videoAgent?.id,
      agentLabel: videoAgent?.name,
    });
    trackedJobId = job.id;
    await updateGenerationRequestMetadata(requestId, { provider, modelId: model, modelLabel: catalogModel.label, agent: videoAgent?.name ?? agentId });
    const work = executeVideoJob({
      jobId: job.id,
      userId: user.id,
      conversationId: conversation.id,
      conversationTitle: conversation.title,
      locale,
      multiplier: setup.multiplier,
      provider,
      model,
      modelLabel: catalogModel.label,
      prompt: promptForTransfer,
      mode,
      duration,
      resolution,
      aspectRatio,
      sound,
      style,
      requestId,
      agentId: videoAgent?.id,
      agentLabel: videoAgent?.name,
      firstFrame: mode === "image-to-video" || mode === "motion-control" ? (firstFrame || references[0]) : undefined,
      lastFrame: mode === "image-to-video" ? lastFrame : undefined,
      references: mode === "ref-to-video" || mode === "motion-control" || (mode === "video-to-video" && videoV2vAcceptsPhotos(catalogModel))
        ? (references.length ? references : firstFrame ? [firstFrame] : undefined)
        : undefined,
      videos: mode === "video-to-video" || mode === "motion-control" ? videos : undefined,
    });
    after(() => work);
    workScheduled = true;
    return Response.json({
      job: publicVideoJob(job),
      balanceTokens: job.balanceTokens,
      conversation: { id: conversation.id, title: conversation.title, updatedAt: conversation.updated_at.toISOString() },
    }, { status: 202 });
  } catch (error) {
    const message = (error as Error).message;
    const errorCopy = apiAppCopy(locale);
    if (trackedJobId && !workScheduled) await markVideoJobFailed(trackedJobId, message || "VIDEO_REQUEST_FAILED").catch(() => {});
    if (requestId) await failGenerationRequest(requestId, message || "VIDEO_REQUEST_FAILED").catch(() => {});
    if (message === "VIDEO_PARAMS_INVALID") return jsonError(errorCopy.imageParamsRequired, 400);
    if (message.startsWith("VIDEO_CLIP_INVALID:")) return jsonError(message.slice("VIDEO_CLIP_INVALID:".length), 400);
    if (message === "UNAUTHORIZED") return jsonError(errorCopy.authRequired, 401);
    if (message === "INSUFFICIENT_BALANCE" || message === "ANSWER_REQUIRES_TOP_UP") {
      return jsonTopUpError(errorCopy.topUpToSeeAnswer, topUpBalanceFromError(error));
    }
    if (message === "IMAGE_BUSY") return jsonError(errorCopy.imageRateLimited, 429);
    if (message === "PROVIDER_NOT_AVAILABLE") return jsonError(errorCopy.imageProviderUnavailable, 409);
    if (message === "IMAGE_CONVERSATION_NOT_FOUND") return jsonError(errorCopy.imageConversationNotFound, 404);
    if (message === "IMAGE_CONVERSATION_ID_INVALID") return jsonError(errorCopy.conversationInvalid, 400);
    if (message === "VIDEO_MODE_UNSUPPORTED" || message === "VIDEO_INPUT_REQUIRED") return jsonError(errorCopy.imageParamsRequired, 400);
    if (message === "VIDEO_AGENT_INVALID") return jsonError(errorCopy.imageParamsRequired, 400);
    if (message === "VIDEO_REFERENCE_MIX_UNSUPPORTED") return jsonError(videoReferenceMixUnsupportedCopy(locale), 400);
    if (message === "CHARACTER_RIGHTS_CONFIRMATION_REQUIRED") return jsonError(videoCharacterRightsCopy(locale), 400);
    if (message === "CHARACTER_NOT_FOUND" || message === "CHARACTER_MODEL_UNSUPPORTED") return jsonError(characterUiCopy(locale).noReady, 400);
    console.error("video_generation_failed", error instanceof Error ? error.message : "unknown");
    return jsonError(promptBlockedCopy[locale] ?? promptBlockedCopy.en, 502);
  }
}
