import "server-only";

import { chargedTokensFromUsd, paidTokensSpent, unpaidOverdraftTokens, usdFromPaidTokens } from "@/lib/billing";
import { IMAGE_SLOT_WAIT_MS } from "@/lib/chat-request-policy";
import { imageGenerationSlots } from "@/lib/request-slots";
import { mediaFailureIsFinal, mediaJobResult } from "@/lib/server/media-job-outcome";
import { incrementWelcomeBonus } from "@/lib/server/welcome-bonus";
import { withTransaction } from "@/lib/server/db";
import { DEBIT_USER_BALANCE_SQL } from "@/lib/server/paid-balance";
import { generationReservation, captureGenerationTokens, dispatchReservedGeneration } from "@/lib/server/generation-reservations";
import { ackAfterPersist, markGenerationJobFailed, type GenerationJobRow } from "@/lib/server/generation-jobs";
import { integratorGenerateImage, type IntegratorImageResult } from "@/lib/server/integrator";
import { keepMediaLocal } from "@/lib/server/media-assets";
import { PERSIST_USER_LOCALE_SQL, usageHistoryCopy, usageHistoryLocale } from "@/lib/usage-history-copy";
import type { Locale } from "@/lib/locale-from-request";

const IMAGE_URL_ID = /^\/v1\/images\/([a-zA-Z0-9-]+)$/;

export type ImageJobInput = {
  complimentary?: boolean;
  characterId?: string;
  coverTrackId?: string;
  jobId: string;
  userId: string;
  conversationId: string;
  conversationTitle: string;
  locale: Locale;
  multiplier: number;
  provider: string;
  model: string;
  prompt: string;
  storedPrompt: string;
  size: string;
  format: string;
  style: string;
  reasoning?: string;
  inputImage?: string;
  inputImages?: string[];
  count: 1 | 2 | 4;
  imageAgentId?: string | null;
  imageAgentName?: string;
  sourceImageCount: number;
};

export function publicImageGeneration(input: {
  conversationId: string;
  requestId: string;
  provider: string;
  modelId: string;
  modelLabel: string;
  prompt: string;
  size: string;
  format: string;
  style: string;
  reasoning: string | null;
  billedTokens: number;
  createdAt: string;
  assetIds: string[];
}) {
  return {
    conversationId: input.conversationId,
    requestId: input.requestId,
    provider: input.provider,
    modelId: input.modelId,
    modelLabel: input.modelLabel,
    prompt: input.prompt,
    size: input.size,
    format: input.format,
    style: input.style,
    reasoning: input.reasoning,
    billedTokens: input.billedTokens,
    createdAt: input.createdAt,
    images: input.assetIds.map((id) => ({ id, url: `/api/images/assets/${id}`, previewUrl: `/api/images/assets/${id}?variant=preview` })),
    kind: "photo" as const,
  };
}

export async function executeImageJob(input: ImageJobInput): Promise<void> {
  let started = false;
  let received = false;
  try {
    const release = await imageGenerationSlots.acquire(IMAGE_SLOT_WAIT_MS);
    if (!release) throw new Error("IMAGE_BUSY");
    let result: IntegratorImageResult;
    try {
      if (!await dispatchReservedGeneration(input.jobId)) return;
      started = true;
      result = await integratorGenerateImage({
        provider: input.provider,
        model: input.model,
        prompt: input.prompt,
        size: input.size,
        format: input.format,
        style: input.style,
        reasoning: input.reasoning,
        inputImage: input.inputImage,
        inputImages: input.inputImages,
        count: input.count,
        requestId: input.jobId,
      });
    } finally {
      release();
    }
    received = true;
    await persistReadyImageJob(input, result);
  } catch (error) {
    if (await mediaFailureIsFinal(error, input.jobId, started, received)) {
      await markGenerationJobFailed(input.jobId, error instanceof Error ? error.message : "failed");
    }
    console.error("image_job_failed", input.jobId, error instanceof Error ? error.message : "unknown");
  }
}

export async function settleImageJob(job: GenerationJobRow): Promise<void> {
  const recovered = await mediaJobResult<IntegratorImageResult>(job.id, (reason) => markGenerationJobFailed(job.id, reason));
  if (!recovered) return;
  const payload = job.payload;
  await persistReadyImageJob({
    complimentary: payload.complimentary === true,
    characterId: payload.characterId ? String(payload.characterId) : undefined,
    coverTrackId: payload.coverTrackId ? String(payload.coverTrackId) : undefined,
    jobId: job.id,
    userId: job.user_id,
    conversationId: String(payload.conversationId ?? job.conversation_id ?? ""),
    conversationTitle: String(payload.conversationTitle ?? job.title ?? ""),
    locale: (typeof payload.locale === "string" ? payload.locale : "ru") as Locale,
    multiplier: Number(payload.multiplier ?? 1),
    provider: String(payload.provider ?? ""),
    model: String(payload.model ?? ""),
    prompt: String(payload.prompt ?? ""),
    storedPrompt: String(payload.storedPrompt ?? payload.prompt ?? ""),
    size: String(payload.size ?? ""),
    format: String(payload.format ?? ""),
    style: String(payload.style ?? "auto"),
    reasoning: payload.reasoning ? String(payload.reasoning) : undefined,
    count: ([1, 2, 4].includes(Number(payload.count)) ? Number(payload.count) : 1) as 1 | 2 | 4,
    imageAgentId: payload.imageAgentId ? String(payload.imageAgentId) : null,
    imageAgentName: payload.imageAgentName ? String(payload.imageAgentName) : undefined,
    sourceImageCount: Number(payload.sourceImageCount ?? 0),
  }, recovered);
}

async function persistReadyImageJob(input: ImageJobInput, result: IntegratorImageResult): Promise<void> {
  const costUsd = Number(result.usage.cost_usd);
  if (!Number.isFinite(costUsd) || costUsd < 0) throw new Error("INVALID_INTEGRATOR_COST");
  const assetIds = result.data.map((image) => IMAGE_URL_ID.exec(image.url)?.[1]).filter((id): id is string => Boolean(id));
  if (!assetIds.length && result.data?.length) {
    const fromHold = result.data.map((item) => IMAGE_URL_ID.exec(item.url)?.[1]).filter((id): id is string => Boolean(id));
    if (!fromHold.length) throw new Error("IMAGE_ASSET_MISSING");
  }
  if (!assetIds.length) throw new Error("IMAGE_ASSET_MISSING");
  await keepMediaLocal("image", assetIds);
  const copy = usageHistoryCopy(input.locale);
  const persisted = await withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [input.jobId]);
    const current = await client.query<{ status: string; created_at: Date }>(`SELECT status,created_at FROM generation_jobs WHERE id=$1 FOR UPDATE`, [input.jobId]);
    if (current.rows[0]?.status !== "creating") return null;
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [input.userId]);
    const balance = await client.query<{ balance_tokens: string; paid_balance_tokens: string }>(
      "SELECT balance_tokens, paid_balance_tokens FROM users WHERE id=$1 FOR UPDATE",
      [input.userId],
    );
    const totalTokens = Number(balance.rows[0]?.balance_tokens ?? 0);
    const paidTokens = Number(balance.rows[0]?.paid_balance_tokens ?? 0);
    const reservation = input.complimentary ? null : await generationReservation(client, input.jobId, input.userId);
    const billedTokens = input.complimentary ? 0 : reservation ? Number(reservation.tokens) : chargedTokensFromUsd(costUsd, input.multiplier);
    const revenueUsd = input.complimentary ? 0 : usdFromPaidTokens(reservation ? Number(reservation.paid_tokens) : paidTokensSpent(paidTokens, totalTokens, billedTokens));
    const unpaidTokens = input.complimentary ? 0 : reservation ? 0 : unpaidOverdraftTokens(totalTokens, billedTokens);
    const usageId = `image-${input.jobId}`;
    await client.query(
      `INSERT INTO usage_entries(id,user_id,chat_title,model,model_id,provider,agent,input_tokens,output_tokens,billed_input_tokens,billed_output_tokens,billed_tokens,unpaid_tokens,billing_multiplier,cost_usd,revenue_usd,tool_cost_usd,latency_ms,integrator_chat_id,upstream_request_id,usage_comment)
       VALUES($1,$2,$3,$4,$5,$6,$7,0,0,0,$8,$8,$9,$10,$11,$12,0,$13,$14,$14,$15)
       ON CONFLICT (id) DO NOTHING`,
      [
        usageId, input.userId, input.conversationTitle, result.meta.model_label, input.model, input.provider,
        input.imageAgentName ?? "", billedTokens, unpaidTokens, input.multiplier, costUsd, revenueUsd,
        result.meta.latency_ms, result.request_id || input.jobId,
        input.imageAgentName ? copy.imageCommentWithAgent(input.imageAgentName, assetIds.length) : copy.imageComment(assetIds.length),
      ],
    );
    const alreadyDebited = input.complimentary
      ? { rowCount: 0 }
      : await client.query<{ id: string }>(`SELECT id FROM balance_transactions WHERE usage_entry_id=$1 LIMIT 1`, [usageId]);
    const captured = input.complimentary
      ? true
      : await captureGenerationTokens(client, input.jobId, input.userId, usageId, `Генерация ${result.meta.model_label}`);
    if (!captured && !alreadyDebited.rowCount && billedTokens > 0) {
      await client.query("INSERT INTO balance_transactions(user_id,kind,token_delta,note,usage_entry_id) VALUES($1,'usage',$2,$3,$4)", [input.userId, -billedTokens, copy.imageGeneration(result.meta.model_label), usageId]);
      const updated = await client.query<{ balance_tokens: string }>(DEBIT_USER_BALANCE_SQL, [input.userId, billedTokens]);
      if (!updated.rowCount) throw new Error("ANSWER_REQUIRES_TOP_UP");
    }
    const remaining = Number((await client.query<{ balance_tokens: string }>("SELECT balance_tokens FROM users WHERE id=$1", [input.userId])).rows[0]?.balance_tokens ?? 0);
    if (reservation || remaining >= 0) {
      await client.query(
        `INSERT INTO image_generations(user_id,conversation_id,request_id,provider,model_id,model_label,prompt,size,format,style,reasoning,asset_ids,cost_usd,billing_multiplier,billed_tokens,latency_ms,usage_entry_id,image_agent_id,source_image_count,created_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
         ON CONFLICT (request_id) DO UPDATE SET deleted_at=NULL`,
        [
          input.userId, input.conversationId, result.request_id || input.jobId, input.provider, input.model,
          result.meta.model_label, input.storedPrompt, input.size, input.format, input.style, input.reasoning ?? null,
          assetIds, costUsd, input.multiplier, billedTokens, result.meta.latency_ms, usageId, input.imageAgentId ?? null,
          input.sourceImageCount, current.rows[0].created_at,
        ],
      );
    }
    await client.query(PERSIST_USER_LOCALE_SQL, [input.userId, usageHistoryLocale(input.locale)]);
    if (input.coverTrackId) await client.query(
      "UPDATE music_tracks SET cover_asset_id=$3,cover_upload=NULL,cover_upload_mime=NULL,updated_at=now() WHERE id=$1 AND user_id=$2",
      [input.coverTrackId, input.userId, assetIds[0]]);
    if (input.characterId) await client.query(
      "UPDATE characters SET status='ready',sheet_asset_ids=$2,error=NULL,updated_at=now() WHERE id=$1 AND user_id=$3 AND status='creating' AND deleted_at IS NULL",
      [input.characterId, assetIds, input.userId]);
    await client.query("UPDATE image_conversations SET updated_at=now() WHERE id=$1", [input.conversationId]);
    const generation = publicImageGeneration({
      conversationId: input.conversationId, requestId: result.request_id || input.jobId,
      provider: input.provider, modelId: input.model, modelLabel: result.meta.model_label,
      prompt: input.storedPrompt, size: input.size, format: input.format, style: input.style,
      reasoning: input.reasoning ?? null, billedTokens, createdAt: current.rows[0].created_at.toISOString(), assetIds,
    });
    await client.query(
      "UPDATE generation_jobs SET status='ready',result=$2::jsonb,error=NULL,updated_at=now() WHERE id=$1 AND status='creating'",
      [input.jobId, JSON.stringify({
        coverUrl: input.coverTrackId ? `/api/images/assets/${assetIds[0]}?variant=preview` : undefined,
        generation, conversation: { id: input.conversationId, title: input.conversationTitle, updatedAt: new Date().toISOString() },
        balanceTokens: remaining,
      })]);
    await client.query(
      `UPDATE generation_request_registry SET status='success',error=NULL,response_at=now(),updated_at=now() WHERE id=$1 AND status='running'`,
      [input.jobId],
    );
    return { remaining, billedTokens };
  });
  if (!persisted) return;
  await ackAfterPersist(input.jobId);
  if (!input.complimentary && persisted.remaining >= 0) await incrementWelcomeBonus(input.userId, "images").catch(() => undefined);
}
