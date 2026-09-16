import "server-only";

import { randomUUID } from "node:crypto";
import { publicErrorCode, publicErrorMessage } from "@/lib/public-error";
import { isPipeBreak } from "@/lib/integrator-usage";
import { query, withTransaction } from "@/lib/server/db";
import { reserveGenerationTokens, refundGenerationTokens } from "@/lib/server/generation-reservations";
import {
  integratorAckRequest,
  integratorGetRequest,
  waitForWarehouseResult,
} from "@/lib/server/integrator";

export type GenerationKind = "chat" | "image" | "video" | "music";
export type GenerationSurface = "chat" | "images" | "audio";
export type GenerationStatus = "creating" | "ready" | "failed";

export type GenerationJobRow = {
  id: string;
  user_id: string;
  kind: GenerationKind;
  surface: GenerationSurface;
  conversation_id: string | null;
  status: GenerationStatus;
  title: string | null;
  model_label: string | null;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  acked_at: Date | null;
  created_at: Date;
  updated_at: Date;
  balanceTokens?: number;
};

export function publicGenerationJob(row: GenerationJobRow) {
  const locale = typeof row.payload.locale === "string" ? row.payload.locale : "ru";
  return {
    id: row.id,
    kind: row.kind,
    surface: row.surface,
    conversationId: row.conversation_id,
    status: row.status,
    title: row.title,
    modelLabel: row.model_label,
    createdAt: row.created_at.toISOString(),
    errorCode: row.status === "failed" ? publicErrorCode(row.error) : null,
    error: row.status === "failed" ? publicErrorMessage(row.error, locale) : row.error,
    result: row.status === "ready" ? row.result : undefined,
  };
}

export async function insertGenerationJob(input: {
  id?: string;
  userId: string;
  kind: GenerationKind;
  surface: GenerationSurface;
  conversationId?: string | null;
  title?: string | null;
  modelLabel?: string | null;
  payload?: Record<string, unknown>;
  reservationTokens?: number;
  complimentary?: boolean;
}): Promise<GenerationJobRow> {
  const id = input.id ?? randomUUID();
  return withTransaction(async (client) => {
  const balanceTokens = input.kind === "chat" || input.complimentary ? undefined
    : await reserveGenerationTokens(client, id, input.userId, input.reservationTokens ?? NaN);
  const { rows } = await client.query<GenerationJobRow>(
    `INSERT INTO generation_jobs(id,user_id,kind,surface,conversation_id,status,title,model_label,payload)
     VALUES($1,$2,$3,$4,$5,'creating',$6,$7,$8::jsonb)
     RETURNING id,user_id,kind,surface,conversation_id,status,title,model_label,payload,result,error,acked_at,created_at,updated_at`,
    [
      id,
      input.userId,
      input.kind,
      input.surface,
      input.conversationId ?? null,
      input.title ?? null,
      input.modelLabel ?? null,
      JSON.stringify(input.payload ?? {}),
    ],
  );
  return { ...rows[0], balanceTokens };
  });
}

export async function getGenerationJob(userId: string, jobId: string): Promise<GenerationJobRow | undefined> {
  const rows = await query<GenerationJobRow>(
    `SELECT id,user_id,kind,surface,conversation_id,status,title,model_label,payload,result,error,acked_at,created_at,updated_at
       FROM generation_jobs WHERE id=$1 AND user_id=$2`,
    [jobId, userId],
  );
  return rows[0];
}

export async function listCreatingGenerationJobs(userId: string): Promise<GenerationJobRow[]> {
  return query<GenerationJobRow>(
    `SELECT id,user_id,kind,surface,conversation_id,status,title,model_label,payload,result,error,acked_at,created_at,updated_at
       FROM generation_jobs WHERE user_id=$1 AND status='creating' ORDER BY created_at DESC LIMIT 40`,
    [userId],
  );
}

export async function listVisibleGenerationJobs(userId: string): Promise<GenerationJobRow[]> {
  return query<GenerationJobRow>(
    `SELECT g.id,g.user_id,g.kind,g.surface,g.conversation_id,g.status,g.title,g.model_label,g.payload,g.result,g.error,g.acked_at,g.created_at,g.updated_at
       FROM generation_jobs g
       LEFT JOIN conversations c ON g.kind='chat' AND c.id=g.conversation_id AND c.user_id=g.user_id
      WHERE g.user_id=$1
        AND (g.kind<>'chat' OR c.hidden_at IS NULL)
        AND (g.status='creating' OR (g.status='ready' AND g.updated_at > now() - interval '30 minutes') OR (g.status='failed' AND g.dismissed_at IS NULL))
      ORDER BY g.created_at DESC LIMIT 40`,
    [userId],
  );
}

export async function dismissFailedGenerationJob(userId: string, jobId: string): Promise<void> {
  await query(
    "UPDATE generation_jobs SET dismissed_at=now() WHERE id=$1 AND user_id=$2 AND status='failed'",
    [jobId, userId],
  );
}

export async function listCreatingJobsForLamp(userId: string) {
  const jobs = await listCreatingGenerationJobs(userId);
  return jobs.map(publicGenerationJob);
}

export async function markGenerationJobReady(jobId: string, result: Record<string, unknown>): Promise<void> {
  await query(
    `UPDATE generation_jobs SET status='ready', result=$2::jsonb, error=NULL, updated_at=now()
      WHERE id=$1 AND status='creating'`,
    [jobId, JSON.stringify(result)],
  );
}

export async function markGenerationJobFailed(jobId: string, error: string, onlyUndispatched = false): Promise<void> {
  await withTransaction(async (client) => {
    const job = await client.query<{
      user_id: string;
      kind: string;
      status: string;
      conversation_id: string | null;
      title: string | null;
      model_label: string | null;
      payload: Record<string, unknown>;
    }>("SELECT user_id,kind,status,conversation_id,title,model_label,payload FROM generation_jobs WHERE id=$1 FOR UPDATE", [jobId]);
    const row = job.rows[0];
    if (!row || row.status !== "creating") return;
    if (row.kind !== "chat" && !await refundGenerationTokens(client, jobId, row.user_id, onlyUndispatched)) return;
    const provider = typeof row.payload.provider === "string"
      ? row.payload.provider
      : typeof row.payload.providerId === "string" ? row.payload.providerId : "";
    const modelId = typeof row.payload.model === "string"
      ? row.payload.model
      : typeof row.payload.modelId === "string" ? row.payload.modelId : null;
    const agent = typeof row.payload.agentName === "string"
      ? row.payload.agentName
      : typeof row.payload.imageAgentName === "string" ? row.payload.imageAgentName
      : typeof row.payload.agentId === "string" ? row.payload.agentId : "";
    const multiplier = Number(row.payload.multiplier);
    await client.query(
      `INSERT INTO usage_entries(
         id,user_id,conversation_id,chat_title,model,model_id,provider,agent,
         input_tokens,output_tokens,billed_input_tokens,billed_output_tokens,billed_tokens,
         billing_multiplier,cost_usd,revenue_usd,upstream_request_id,usage_comment,deleted,internal_only
       ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,0,0,0,0,0,$9,0,0,$10,$11,false,true)
       ON CONFLICT DO NOTHING`,
      [
        `${row.kind}-failed-${jobId}`,
        row.user_id,
        row.conversation_id,
        row.title || row.model_label || row.kind,
        row.model_label || modelId || row.kind,
        modelId,
        provider,
        agent,
        Number.isFinite(multiplier) ? multiplier : 1,
        jobId,
        error.slice(0, 500),
      ],
    );
    await client.query(
    `UPDATE generation_jobs SET status='failed', error=$2, updated_at=now() WHERE id=$1 AND status='creating'`,
    [jobId, error.slice(0, 500)],
  );
    if (typeof row.payload.characterId === "string") {
      await client.query(
        "UPDATE characters SET status='failed',error=$2,updated_at=now() WHERE id=$1 AND status='creating'",
        [row.payload.characterId, error.slice(0, 500)],
      );
    }
  });
}

export async function markGenerationJobAcked(jobId: string): Promise<void> {
  await query(`UPDATE generation_jobs SET acked_at=now(), updated_at=now() WHERE id=$1 AND acked_at IS NULL`, [jobId]);
}

export async function ackAfterPersist(requestId: string): Promise<void> {
  try {
    await integratorAckRequest(requestId);
    await markGenerationJobAcked(requestId);
  } catch (error) {
    console.error("generation_ack_failed", requestId, error instanceof Error ? error.message : "unknown");
  }
}

export async function recoverHeldResult<T>(requestId: string): Promise<T | null> {
  try {
    return await waitForWarehouseResult<T>(requestId);
  } catch (error) {
    if (isPipeBreak(error) || (error instanceof Error && error.message === "WAREHOUSE_WAIT_TIMEOUT")) return null;
    const status = error && typeof error === "object" && "statusCode" in error
      ? Number((error as { statusCode: number }).statusCode)
      : 0;
    if (status === 404) return null;
    throw error;
  }
}

export async function peekHoldStatus(requestId: string) {
  return integratorGetRequest(requestId).catch(() => null);
}
