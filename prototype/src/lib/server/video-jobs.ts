import "server-only";

import { chargedTokensFromUsd, paidTokensSpent, unpaidOverdraftTokens, usdFromPaidTokens } from "@/lib/billing";
import { publicErrorCode, publicErrorMessage } from "@/lib/public-error";
import { mediaFailureIsFinal, mediaJobOutcome } from "@/lib/server/media-job-outcome";
import { IMAGE_SLOT_WAIT_MS } from "@/lib/chat-request-policy";
import type { VideoSound } from "@/lib/catalog/video-studio";
import { applyVideoStylePriority } from "@/lib/i18n/copy/video-styles";
import { query, withTransaction } from "@/lib/server/db";
import { DEBIT_USER_BALANCE_SQL } from "@/lib/server/paid-balance";
import { reserveGenerationTokens, refundGenerationTokens, generationReservation, captureGenerationTokens, dispatchReservedGeneration } from "@/lib/server/generation-reservations";
import { ackAfterPersist } from "@/lib/server/generation-jobs";
import { keepMediaLocal } from "@/lib/server/media-assets";
import {
  integratorGenerateVideo,
  integratorUsageBySource,
  integratorVideoAssetsByRequest,
  type IntegratorVideoResult,
} from "@/lib/server/integrator";
import { videoGenerationSlots } from "@/lib/request-slots";
import { PERSIST_USER_LOCALE_SQL, usageHistoryCopy, usageHistoryLocale } from "@/lib/usage-history-copy";

type VideoGenerationRow = {
  conversation_id: string;
  request_id: string;
  provider: string;
  model_id: string;
  model_label: string;
  prompt: string;
  mode: string;
  duration_sec: number;
  resolution: string;
  aspect_ratio: string;
  sound: string;
  style: string;
  asset_ids: string[];
  billed_tokens: string;
  created_at: Date;
};

export function publicVideoGeneration(row: VideoGenerationRow) {
  return {
    kind: "video" as const,
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
    durationSec: row.duration_sec,
    sound: row.sound === "on" ? "on" as const : "off" as const,
    images: row.asset_ids.map((id) => ({ id, url: `/api/video/assets/${id}`, previewUrl: `/api/video/assets/${id}?variant=preview` })),
  };
}

const VIDEO_INTEGRATOR_SOURCE = (jobId: string) => `Genora.art · Видео · ${jobId}`;
const VIDEO_URL_ID = /^\/v1\/videos\/([a-zA-Z0-9-]+)$/;

export type VideoJobRow = {
  id: string;
  user_id: string;
  conversation_id: string;
  status: "creating" | "ready" | "failed";
  provider: string;
  model_id: string;
  model_label: string;
  prompt: string;
  mode: string;
  duration_sec: number;
  resolution: string;
  aspect_ratio: string;
  sound: string;
  style: string;
  multiplier: string;
  locale: string;
  agent_id: string | null;
  agent_label: string | null;
  integrator_request_id: string | null;
  error: string | null;
  created_at: Date;
  updated_at: Date;
  balanceTokens?: number;
};

export type VideoJobInput = {
  jobId: string;
  userId: string;
  conversationId: string;
  conversationTitle: string;
  locale: string;
  multiplier: number;
  provider: string;
  model: string;
  modelLabel: string;
  prompt: string;
  mode: "text-to-video" | "image-to-video" | "ref-to-video" | "video-to-video" | "motion-control";
  duration: number;
  resolution: string;
  aspectRatio: string;
  sound: VideoSound;
  style: string;
  requestId: string;
  firstFrame?: string;
  lastFrame?: string;
  references?: string[];
  videos?: string[];
  agentId?: string;
  agentLabel?: string;
};

export function publicVideoJob(row: VideoJobRow) {
  return {
    id: row.id,
    status: row.status,
    conversationId: row.conversation_id,
    prompt: row.prompt,
    modelLabel: row.model_label,
    provider: row.provider,
    modelId: row.model_id,
    createdAt: row.created_at.toISOString(),
    errorCode: row.status === "failed" ? publicErrorCode(row.error) : null,
    error: row.status === "failed" ? publicErrorMessage(row.error, row.locale) : row.error,
  };
}

export async function insertVideoJob(input: {
  userId: string;
  conversationId: string;
  provider: string;
  modelId: string;
  modelLabel: string;
  prompt: string;
  mode: string;
  durationSec: number;
  resolution: string;
  aspectRatio: string;
  sound: string;
  style: string;
  multiplier: number;
  locale: string;
  requestId: string;
  reservationTokens: number;
  agentId?: string;
  agentLabel?: string;
}): Promise<VideoJobRow> {
  return withTransaction(async (client) => {
  const { rows } = await client.query<VideoJobRow>(
    `INSERT INTO video_jobs(
      user_id,conversation_id,status,provider,model_id,model_label,prompt,mode,duration_sec,
      resolution,aspect_ratio,sound,style,multiplier,locale,integrator_request_id,agent_id,agent_label
    ) VALUES($1,$2,'creating',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    RETURNING *`,
    [
      input.userId,
      input.conversationId,
      input.provider,
      input.modelId,
      input.modelLabel,
      input.prompt,
      input.mode,
      input.durationSec,
      input.resolution,
      input.aspectRatio,
      input.sound,
      input.style,
      input.multiplier,
      input.locale,
      input.requestId,
      input.agentId ?? null,
      input.agentLabel ?? null,
    ],
  );
  const balanceTokens = await reserveGenerationTokens(client, rows[0].id, input.userId, input.reservationTokens);
  return { ...rows[0], balanceTokens };
  });
}

export async function listCreatingVideoJobs(userId: string): Promise<VideoJobRow[]> {
  return query<VideoJobRow>(
    `SELECT * FROM video_jobs WHERE user_id=$1 AND status='creating' ORDER BY created_at DESC LIMIT 20`,
    [userId],
  );
}

export async function listVisibleVideoJobs(userId: string): Promise<VideoJobRow[]> {
  return query<VideoJobRow>(
    `SELECT * FROM video_jobs
      WHERE user_id=$1
        AND (status='creating' OR (status='ready' AND updated_at > now() - interval '30 minutes') OR (status='failed' AND dismissed_at IS NULL))
      ORDER BY created_at DESC LIMIT 20`,
    [userId],
  );
}

export async function dismissFailedVideoJob(userId: string, jobId: string): Promise<void> {
  await query(
    "UPDATE video_jobs SET dismissed_at=now() WHERE id=$1 AND user_id=$2 AND status='failed'",
    [jobId, userId],
  );
}

export async function getVideoJob(userId: string, jobId: string): Promise<VideoJobRow | undefined> {
  const rows = await query<VideoJobRow>(`SELECT * FROM video_jobs WHERE id=$1 AND user_id=$2`, [jobId, userId]);
  return rows[0];
}

export async function markVideoJobFailed(jobId: string, error: string, onlyUndispatched = false): Promise<void> {
  await withTransaction(async (client) => {
    const job = await client.query<{
      user_id: string;
      conversation_id: string;
      status: string;
      provider: string;
      model_id: string;
      model_label: string;
      multiplier: string;
      integrator_request_id: string | null;
      chat_title: string | null;
      agent_label: string | null;
    }>(`SELECT v.user_id,v.conversation_id,v.status,v.provider,v.model_id,v.model_label,v.multiplier,
              v.integrator_request_id,v.agent_label,c.title AS chat_title
         FROM video_jobs v
         LEFT JOIN image_conversations c ON c.id=v.conversation_id
        WHERE v.id=$1
        FOR UPDATE OF v`, [jobId]);
    const current = job.rows[0];
    if (!current || current.status !== "creating") return;
    if (!await refundGenerationTokens(client, jobId, current.user_id, onlyUndispatched)) return;
    const upstreamRequestId = current.integrator_request_id || jobId;
    await client.query(
      `INSERT INTO usage_entries(
         id,user_id,conversation_id,chat_title,model,model_id,provider,agent,
         input_tokens,output_tokens,billed_input_tokens,billed_output_tokens,billed_tokens,
         billing_multiplier,cost_usd,revenue_usd,upstream_request_id,usage_comment,deleted,internal_only
       ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,0,0,0,0,0,$9,0,0,$10,$11,false,true)
       ON CONFLICT DO NOTHING`,
      [
        `video-failed-${jobId}`,
        current.user_id,
        current.conversation_id,
        current.chat_title || current.model_label,
        current.model_label,
        current.model_id,
        current.provider,
        current.agent_label || "",
        Number(current.multiplier),
        upstreamRequestId,
        error.slice(0, 500),
      ],
    );
    await client.query(
    `UPDATE video_jobs SET status='failed', error=$2, updated_at=now() WHERE id=$1 AND status='creating'`,
    [jobId, error.slice(0, 500)],
  );
  });
}

export async function executeVideoJob(input: VideoJobInput): Promise<void> {
  let started = false;
  let received = false;
  try {
    const release = await videoGenerationSlots.acquire(IMAGE_SLOT_WAIT_MS);
    if (!release) throw new Error("IMAGE_BUSY");
    let result: IntegratorVideoResult;
    try {
      if (!await dispatchReservedGeneration(input.jobId)) return;
      started = true;
      result = await integratorGenerateVideo({
        provider: input.provider,
        model: input.model,
        mode: input.mode,
        prompt: applyVideoStylePriority(input.prompt, usageHistoryLocale(input.locale), input.style),
        duration: input.duration,
        resolution: input.resolution,
        aspectRatio: input.aspectRatio,
        sound: input.sound,
        firstFrame: input.firstFrame,
        lastFrame: input.lastFrame,
        references: input.references,
        videos: input.videos,
        jobId: input.jobId,
        requestId: input.requestId,
      });
    } finally {
      release();
    }
    received = true;
    const assetIds = result.data.map((item) => VIDEO_URL_ID.exec(item.url)?.[1]).filter((id): id is string => Boolean(id));
    await persistReadyVideoJob({
      ...input,
      requestId: result.request_id,
      modelLabel: result.meta.model_label,
      costUsd: Number(result.usage.cost_usd),
      latencyMs: result.meta.latency_ms,
      assetIds,
      durationSec: Math.round(Number(result.meta.duration_sec || result.usage.duration_sec || result.data[0]?.duration_sec || input.duration)),
    });
  } catch (error) {
    if (await mediaFailureIsFinal(error, input.requestId, started, received)) {
      await markVideoJobFailed(input.jobId, error instanceof Error ? error.message : "failed");
    }
    console.error("video_job_failed", input.jobId, error instanceof Error ? error.message : "unknown");
  }
}

export async function reconcileVideoJob(jobId: string, userId: string): Promise<boolean> {
  const job = await getVideoJob(userId, jobId);
  if (!job || job.status !== "creating") return job?.status === "ready";
  const outcome = job.integrator_request_id
    ? await mediaJobOutcome<IntegratorVideoResult>(job.integrator_request_id, (reason) => markVideoJobFailed(jobId, reason))
    : null;
  const held = outcome?.result ?? null;
  if (outcome?.status === "in_progress" || outcome?.status === "error" || outcome?.status === "expired") return false;
  const items = await integratorUsageBySource(VIDEO_INTEGRATOR_SOURCE(jobId)).catch(() => []);
  const hit = held ? { requestId: held.request_id || job.integrator_request_id!, costUsd: held.usage.cost_usd, latencyMs: held.meta.latency_ms }
    : items.find((item) => item.status === "ok" && (item.requestId));
  if (!hit) return false;
  const assets = held ? held.data.map((item) => ({ id: VIDEO_URL_ID.exec(item.url)?.[1] || "", durationSec: item.duration_sec }))
    : await integratorVideoAssetsByRequest(hit.requestId).catch(() => []);
  const assetIds = assets.map((item) => item.id).filter(Boolean);
  if (!assetIds.length) return false;
  await persistReadyVideoJob({
    jobId: job.id,
    userId: job.user_id,
    conversationId: job.conversation_id,
    conversationTitle: "",
    locale: job.locale,
    multiplier: Number(job.multiplier),
    provider: job.provider,
    model: job.model_id,
    modelLabel: job.model_label,
    prompt: job.prompt,
    mode: job.mode as VideoJobInput["mode"],
    duration: job.duration_sec,
    resolution: job.resolution,
    aspectRatio: job.aspect_ratio,
    sound: (job.sound === "on" ? "on" : "off") as VideoSound,
    style: job.style,
    requestId: hit.requestId,
    agentId: job.agent_id ?? undefined,
    agentLabel: job.agent_label ?? undefined,
    costUsd: Number(hit.costUsd ?? 0),
    latencyMs: Number(hit.latencyMs ?? 0),
    assetIds,
    durationSec: assets[0]?.durationSec ?? job.duration_sec,
  });
  return true;
}

async function persistReadyVideoJob(input: VideoJobInput & {
  requestId: string;
  costUsd: number;
  latencyMs: number;
  assetIds: string[];
  durationSec: number;
}): Promise<void> {
  const costUsd = input.costUsd;
  if (!Number.isFinite(costUsd) || costUsd < 0) throw new Error("INVALID_INTEGRATOR_COST");
  if (!input.assetIds.length) throw new Error("VIDEO_ASSET_MISSING");
  await keepMediaLocal("video", input.assetIds);
  const copy = usageHistoryCopy(input.locale);
  await withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [input.jobId]);
    const current = await client.query<{ status: string; created_at: Date }>(`SELECT status,created_at FROM video_jobs WHERE id=$1 FOR UPDATE`, [input.jobId]);
    if (current.rows[0]?.status !== "creating") return;
    const conversation = await client.query<{ id: string; title: string }>(
      `SELECT id, title FROM image_conversations WHERE id=$1 AND user_id=$2`,
      [input.conversationId, input.userId],
    );
    const title = conversation.rows[0]?.title || input.conversationTitle || copy.newImageConversation;
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [input.userId]);
    const balance = await client.query<{ balance_tokens: string; paid_balance_tokens: string }>(
      "SELECT balance_tokens, paid_balance_tokens FROM users WHERE id=$1 FOR UPDATE",
      [input.userId],
    );
    const reservation = await generationReservation(client, input.jobId, input.userId);
    const billedTokens = reservation ? Number(reservation.tokens) : chargedTokensFromUsd(costUsd, input.multiplier);
    if (costUsd > 0 && billedTokens <= 0) throw new Error("INVALID_INTEGRATOR_COST");
    const totalTokens = Number(balance.rows[0]?.balance_tokens ?? 0);
    const paidTokens = Number(balance.rows[0]?.paid_balance_tokens ?? 0);
    const revenueUsd = usdFromPaidTokens(reservation ? Number(reservation.paid_tokens) : paidTokensSpent(paidTokens, totalTokens, billedTokens));
    const unpaidTokens = reservation ? 0 : unpaidOverdraftTokens(totalTokens, billedTokens);
    const usageId = `video-${input.requestId}`;
    await client.query(
      `INSERT INTO usage_entries(id,user_id,chat_title,model,model_id,provider,agent,input_tokens,output_tokens,billed_input_tokens,billed_output_tokens,billed_tokens,unpaid_tokens,billing_multiplier,cost_usd,revenue_usd,tool_cost_usd,latency_ms,integrator_chat_id,upstream_request_id,usage_comment,deleted)
        VALUES($1,$2,$3,$4,$5,$6,$7,0,0,0,$8,$8,$9,$10,$11,$12,0,$13,$14,$14,$15,false)
        ON CONFLICT (id) DO UPDATE SET
          billed_tokens=CASE WHEN usage_entries.billed_tokens=0 THEN EXCLUDED.billed_tokens ELSE usage_entries.billed_tokens END,
          cost_usd=CASE WHEN usage_entries.cost_usd=0 THEN EXCLUDED.cost_usd ELSE usage_entries.cost_usd END,
          unpaid_tokens=CASE WHEN usage_entries.unpaid_tokens=0 THEN EXCLUDED.unpaid_tokens ELSE usage_entries.unpaid_tokens END,
          deleted=false`,
      [usageId, input.userId, title, input.modelLabel, input.model, input.provider, input.agentLabel ?? "", billedTokens, unpaidTokens, input.multiplier, costUsd, revenueUsd, input.latencyMs, input.requestId, copy.imageGeneration(input.modelLabel)],
    );
    const usage = await client.query<{ id: string; billed_tokens: string }>(`SELECT id, billed_tokens::text FROM usage_entries WHERE id=$1 AND user_id=$2`, [usageId, input.userId]);
    if (!usage.rowCount) throw new Error("USAGE_PERSIST_FAILED");
    const alreadyDebited = await client.query<{ id: string }>(`SELECT id FROM balance_transactions WHERE usage_entry_id=$1 LIMIT 1`, [usageId]);
    const captured = await captureGenerationTokens(client, input.jobId, input.userId, usageId, copy.imageGeneration(input.modelLabel));
    if (!captured && !alreadyDebited.rowCount && billedTokens > 0) {
      await client.query("INSERT INTO balance_transactions(user_id,kind,token_delta,note,usage_entry_id) VALUES($1,'usage',$2,$3,$4)", [input.userId, -billedTokens, copy.imageGeneration(input.modelLabel), usageId]);
      const updated = await client.query<{ balance_tokens: string }>(DEBIT_USER_BALANCE_SQL, [input.userId, billedTokens]);
      if (!updated.rowCount) throw new Error("ANSWER_REQUIRES_TOP_UP");
    }
    const remaining = Number((await client.query<{ balance_tokens: string }>("SELECT balance_tokens FROM users WHERE id=$1", [input.userId])).rows[0]?.balance_tokens ?? 0);
    if (remaining >= 0 || billedTokens > 0) {
      await client.query(
        `INSERT INTO video_generations(user_id,conversation_id,request_id,provider,model_id,model_label,prompt,mode,duration_sec,resolution,aspect_ratio,sound,style,asset_ids,cost_usd,billing_multiplier,billed_tokens,latency_ms,usage_entry_id,agent_id,agent_label,created_at)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
          ON CONFLICT (request_id) DO UPDATE SET
            billed_tokens=CASE WHEN video_generations.billed_tokens=0 THEN EXCLUDED.billed_tokens ELSE video_generations.billed_tokens END,
            usage_entry_id=COALESCE(video_generations.usage_entry_id, EXCLUDED.usage_entry_id),
            cost_usd=CASE WHEN video_generations.cost_usd=0 THEN EXCLUDED.cost_usd ELSE video_generations.cost_usd END,
            deleted_at=NULL`,
        [input.userId, input.conversationId, input.requestId, input.provider, input.model, input.modelLabel, input.prompt, input.mode, input.durationSec, input.resolution, input.aspectRatio, input.sound, input.style, input.assetIds, costUsd, input.multiplier, billedTokens, input.latencyMs, usageId, input.agentId ?? null, input.agentLabel ?? null, current.rows[0].created_at],
      );
    }
    await client.query(PERSIST_USER_LOCALE_SQL, [input.userId, usageHistoryLocale(input.locale)]);
    await client.query("UPDATE image_conversations SET updated_at=now() WHERE id=$1", [input.conversationId]);
    await client.query(
      `UPDATE video_jobs SET status='ready', integrator_request_id=$2, model_label=$3, updated_at=now() WHERE id=$1 AND status='creating'`,
      [input.jobId, input.requestId, input.modelLabel],
    );
  });
  await ackAfterPersist(input.requestId);
}

export async function videoJobResult(userId: string, job: VideoJobRow) {
  if (job.status === "creating") await reconcileVideoJob(job.id, userId);
  const latest = await getVideoJob(userId, job.id);
  if (!latest) return { job: publicVideoJob(job) };
  if (latest.status === "ready" && latest.integrator_request_id) {
    const rows = await query<{
      conversation_id: string;
      request_id: string;
      provider: string;
      model_id: string;
      model_label: string;
      prompt: string;
      mode: string;
      duration_sec: number;
      resolution: string;
      aspect_ratio: string;
      sound: string;
      style: string;
      asset_ids: string[];
      billed_tokens: string;
      created_at: Date;
      title: string;
      updated_at: Date;
      balance_tokens: string;
    }>(
      `SELECT v.conversation_id,v.request_id,v.provider,v.model_id,v.model_label,v.prompt,v.mode,v.duration_sec,v.resolution,v.aspect_ratio,v.sound,v.style,v.asset_ids,v.billed_tokens,v.created_at,
              c.title,c.updated_at,u.balance_tokens
         FROM video_generations v
         JOIN image_conversations c ON c.id=v.conversation_id
         JOIN users u ON u.id=v.user_id
        WHERE v.user_id=$1 AND v.request_id=$2 AND v.deleted_at IS NULL`,
      [userId, latest.integrator_request_id],
    );
    const row = rows[0];
    if (row) {
      return {
        job: publicVideoJob(latest),
        generation: publicVideoGeneration(row),
        conversation: { id: row.conversation_id, title: row.title, updatedAt: row.updated_at.toISOString() },
        balanceTokens: Number(row.balance_tokens),
      };
    }
  }
  return {
    job: publicVideoJob(latest),
    error: latest.status === "failed" ? publicVideoJob(latest).error : undefined,
  };
}
