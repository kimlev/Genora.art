import "server-only";

import { chargedTokensFromUsd, paidTokensSpent, unpaidOverdraftTokens, usdFromPaidTokens } from "@/lib/billing";
import { IMAGE_SLOT_WAIT_MS } from "@/lib/chat-request-policy";
import {
  MUSIC_GENRES,
  MUSIC_MOODS,
  MUSIC_PURPOSES,
  MUSIC_STYLES,
  musicDbId,
  musicPromptWithVocal,
  musicTagLabels,
  musicTagPrompt,
  untitledTrackTitle,
} from "@/lib/catalog/music-studio";
import { untitledTrackLabel } from "@/lib/i18n/copy/untitled-track-copy";
import { mediaFailureIsFinal, mediaJobResult } from "@/lib/server/media-job-outcome";
import { musicGenerationSlots } from "@/lib/request-slots";
import { withTransaction } from "@/lib/server/db";
import { ackAfterPersist, markGenerationJobFailed, type GenerationJobRow } from "@/lib/server/generation-jobs";
import { integratorGenerateMusic, type IntegratorMusicResult } from "@/lib/server/integrator";
import { keepMediaLocal } from "@/lib/server/media-assets";
import { DEBIT_USER_BALANCE_SQL } from "@/lib/server/paid-balance";
import { generationReservation, captureGenerationTokens, dispatchReservedGeneration } from "@/lib/server/generation-reservations";
import { PERSIST_USER_LOCALE_SQL, usageHistoryLocale } from "@/lib/usage-history-copy";
import type { Locale } from "@/lib/locale-from-request";

const MUSIC_URL_ID = /^\/v1\/music\/([a-zA-Z0-9-]+)$/;

function actualTrackDurationSec(result: IntegratorMusicResult, requested: number | null) {
  const values = [result.data[0]?.duration_sec, result.usage.duration_sec, result.meta.duration_sec]
    .map((value) => Math.round(Number(value)))
    .filter((value) => Number.isFinite(value) && value > 0 && value < 3600);
  if (!values.length) return null;
  if (requested) {
    const measured = values.find((value) => value !== requested);
    if (measured) return measured;
    return null;
  }
  return values[0];
}

export type MusicJobInput = {
  jobId: string;
  userId: string;
  locale: Locale;
  multiplier: number;
  provider: string;
  model: string;
  mode: "song" | "instrumental";
  prompt: string;
  lyrics?: string;
  title?: string;
  genre?: string;
  style?: string;
  mood?: string;
  purpose?: string;
  bpm: number;
  duration?: number;
  vocal?: "auto" | "female" | "male" | "duet";
  language?: string;
  inputVideo?: string;
};

export function publicMusicTrack(row: {
  id: string;
  request_id: string;
  provider: string;
  model_id: string;
  model_label: string;
  title: string;
  mode: string;
  genre: string | null;
  style: string | null;
  mood: string | null;
  purpose: string | null;
  duration_sec: number | null;
  lyrics: string | null;
  prompt: string;
  asset_id: string;
  mime: string;
  formats: string[];
  cover_asset_id: string | null;
  has_cover_upload?: boolean;
  billed_tokens: string | number;
  created_at: Date | string;
}) {
  return {
    id: row.id,
    requestId: row.request_id,
    provider: row.provider,
    modelId: row.model_id,
    modelLabel: row.model_label,
    title: row.title,
    mode: row.mode,
    genre: row.genre,
    style: row.style,
    mood: row.mood,
    purpose: row.purpose,
    durationSec: row.duration_sec,
    lyrics: row.lyrics,
    prompt: row.prompt,
    url: `/api/music/assets/${row.asset_id}`,
    coverUrl: row.has_cover_upload
      ? `/api/music/tracks/${row.id}/cover?variant=preview`
      : row.cover_asset_id
        ? `/api/images/assets/${row.cover_asset_id}?variant=preview`
        : null,
    mime: row.mime,
    formats: row.formats,
    billedTokens: Number(row.billed_tokens),
    createdAt: typeof row.created_at === "string" ? row.created_at : row.created_at.toISOString(),
  };
}

export async function executeMusicJob(input: MusicJobInput): Promise<void> {
  let started = false;
  let received = false;
  try {
    const release = await musicGenerationSlots.acquire(IMAGE_SLOT_WAIT_MS);
    if (!release) throw new Error("MUSIC_BUSY");
    let result: IntegratorMusicResult;
    try {
      if (!await dispatchReservedGeneration(input.jobId)) return;
      started = true;
      result = await integratorGenerateMusic({
        provider: input.provider,
        model: input.model,
        mode: input.mode,
        prompt: musicPromptWithVocal(input.provider, input.prompt, input.vocal ?? "auto", input.mode),
        lyrics: input.mode === "song" ? input.lyrics || undefined : undefined,
        title: input.title || undefined,
        genre: input.genre ? musicTagPrompt(MUSIC_GENRES, input.genre) || input.genre : undefined,
        style: input.style ? musicTagPrompt(MUSIC_STYLES, input.style) || input.style : undefined,
        mood: input.mood ? musicTagPrompt(MUSIC_MOODS, input.mood) || input.mood : undefined,
        purpose: input.purpose ? musicTagPrompt(MUSIC_PURPOSES, input.purpose) || input.purpose : undefined,
        bpm: input.bpm,
        duration: input.duration,
        vocal: input.mode === "song" ? input.vocal : undefined,
        language: input.language,
        inputVideo: input.inputVideo,
        requestId: input.jobId,
      });
    } finally {
      release();
    }
    received = true;
    await persistReadyMusicJob(input, result);
  } catch (error) {
    if (await mediaFailureIsFinal(error, input.jobId, started, received)) {
      await markGenerationJobFailed(input.jobId, error instanceof Error ? error.message : "failed");
    }
    console.error("music_job_failed", input.jobId, error instanceof Error ? error.message : "unknown");
  }
}

export async function settleMusicJob(job: GenerationJobRow): Promise<void> {
  const recovered = await mediaJobResult<IntegratorMusicResult>(job.id, (reason) => markGenerationJobFailed(job.id, reason));
  if (!recovered) return;
  const payload = job.payload;
  await persistReadyMusicJob({
    jobId: job.id,
    userId: job.user_id,
    locale: (typeof payload.locale === "string" ? payload.locale : "ru") as Locale,
    multiplier: Number(payload.multiplier ?? 1),
    provider: String(payload.provider ?? ""),
    model: String(payload.model ?? ""),
    mode: payload.mode === "instrumental" ? "instrumental" : "song",
    prompt: String(payload.prompt ?? ""),
    lyrics: payload.lyrics ? String(payload.lyrics) : undefined,
    title: payload.title ? String(payload.title) : undefined,
    genre: payload.genre ? String(payload.genre) : undefined,
    style: payload.style ? String(payload.style) : undefined,
    mood: payload.mood ? String(payload.mood) : undefined,
    purpose: payload.purpose ? String(payload.purpose) : undefined,
    bpm: Number(payload.bpm ?? 133),
    duration: payload.duration != null ? Number(payload.duration) : undefined,
    vocal: ["auto", "female", "male", "duet"].includes(String(payload.vocal ?? ""))
      ? String(payload.vocal) as MusicJobInput["vocal"]
      : undefined,
    language: payload.language ? String(payload.language) : undefined,
  }, recovered);
}

async function persistReadyMusicJob(input: MusicJobInput, result: IntegratorMusicResult): Promise<void> {
  const costUsd = Number(result.usage.cost_usd);
  if (!Number.isFinite(costUsd) || costUsd < 0) throw new Error("INVALID_INTEGRATOR_COST");
  const assetId = MUSIC_URL_ID.exec(result.data[0]?.url || "")?.[1];
  if (!assetId) throw new Error("MUSIC_ASSET_MISSING");
  await keepMediaLocal("music", [assetId]);
  const trackTitle = input.title || untitledTrackTitle(result.request_id || input.jobId, untitledTrackLabel(input.locale));
  const mime = result.data[0]?.mime || "audio/mpeg";
  const formats = mime.includes("wav") ? ["wav", "mp3"] : ["mp3"];
  const persisted = await withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [input.jobId]);
    const current = await client.query<{ status: string }>(`SELECT status FROM generation_jobs WHERE id=$1 FOR UPDATE`, [input.jobId]);
    if (current.rows[0]?.status !== "creating") return null;
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [input.userId]);
    const balance = await client.query<{ balance_tokens: string; paid_balance_tokens: string }>(
      "SELECT balance_tokens, paid_balance_tokens FROM users WHERE id=$1 FOR UPDATE",
      [input.userId],
    );
    const totalTokens = Number(balance.rows[0]?.balance_tokens ?? 0);
    const paidTokens = Number(balance.rows[0]?.paid_balance_tokens ?? 0);
    const reservation = await generationReservation(client, input.jobId, input.userId);
    const billedTokens = reservation ? Number(reservation.tokens) : chargedTokensFromUsd(costUsd, input.multiplier);
    const revenueUsd = usdFromPaidTokens(reservation ? Number(reservation.paid_tokens) : paidTokensSpent(paidTokens, totalTokens, billedTokens));
    const unpaidTokens = reservation ? 0 : unpaidOverdraftTokens(totalTokens, billedTokens);
    const usageId = `music-${input.jobId}`;
    await client.query(
      `INSERT INTO usage_entries(id,user_id,chat_title,model,model_id,provider,agent,input_tokens,output_tokens,billed_input_tokens,billed_output_tokens,billed_tokens,unpaid_tokens,billing_multiplier,cost_usd,revenue_usd,tool_cost_usd,latency_ms,integrator_chat_id,upstream_request_id,usage_comment)
       VALUES($1,$2,$3,$4,$5,$6,$7,0,0,0,$8,$8,$9,$10,$11,$12,0,$13,$14,$14,$15)
       ON CONFLICT (id) DO NOTHING`,
      [
        usageId, input.userId, trackTitle, result.meta.model_label, musicDbId(input.provider, input.model), input.provider, "",
        billedTokens, unpaidTokens, input.multiplier, costUsd, revenueUsd, result.meta.latency_ms, result.request_id || input.jobId,
        input.mode === "instrumental" ? "Музыка ИИ" : "Песня ИИ",
      ],
    );
    const alreadyDebited = await client.query<{ id: string }>(`SELECT id FROM balance_transactions WHERE usage_entry_id=$1 LIMIT 1`, [usageId]);
    const captured = await captureGenerationTokens(client, input.jobId, input.userId, usageId, `Генерация ${result.meta.model_label}`);
    if (!captured && !alreadyDebited.rowCount && billedTokens > 0) {
      await client.query("INSERT INTO balance_transactions(user_id,kind,token_delta,note,usage_entry_id) VALUES($1,'usage',$2,$3,$4)", [input.userId, -billedTokens, `Генерация ${result.meta.model_label}`, usageId]);
      const updated = await client.query<{ balance_tokens: string }>(DEBIT_USER_BALANCE_SQL, [input.userId, billedTokens]);
      if (!updated.rowCount) throw new Error("ANSWER_REQUIRES_TOP_UP");
    }
    const remaining = Number((await client.query<{ balance_tokens: string }>("SELECT balance_tokens FROM users WHERE id=$1", [input.userId])).rows[0]?.balance_tokens ?? 0);
    let track: Parameters<typeof publicMusicTrack>[0] | null = null;
    if (reservation || remaining >= 0) {
      const inserted = await client.query<{
        id: string; request_id: string; provider: string; model_id: string; model_label: string; title: string; mode: string;
        genre: string | null; style: string | null; mood: string | null; purpose: string | null; duration_sec: number | null;
        lyrics: string | null; prompt: string; asset_id: string; mime: string; formats: string[]; cover_asset_id: string | null;
        has_cover_upload: boolean; billed_tokens: string; created_at: Date;
      }>(
        `INSERT INTO music_tracks(user_id,request_id,provider,model_id,model_label,title,mode,genre,style,mood,purpose,duration_sec,lyrics,prompt,asset_id,mime,formats,billed_tokens)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         ON CONFLICT (request_id) DO UPDATE SET deleted_at=NULL
         RETURNING id,request_id,provider,model_id,model_label,title,mode,genre,style,mood,purpose,duration_sec,lyrics,prompt,asset_id,mime,formats,cover_asset_id,(cover_upload IS NOT NULL) AS has_cover_upload,billed_tokens,created_at`,
        [
          input.userId, result.request_id || input.jobId, input.provider, input.model, result.meta.model_label, trackTitle, input.mode,
          input.genre ? musicTagLabels(MUSIC_GENRES, input.genre) : null,
          input.style ? musicTagLabels(MUSIC_STYLES, input.style) : null,
          input.mood ? musicTagLabels(MUSIC_MOODS, input.mood) : null,
          input.purpose ? musicTagLabels(MUSIC_PURPOSES, input.purpose) : null,
          actualTrackDurationSec(result, input.duration ?? null),
          result.lyrics || input.lyrics || null, input.prompt, assetId, mime, formats, billedTokens,
        ],
      );
      track = inserted.rows[0] ?? null;
    }
    await client.query(PERSIST_USER_LOCALE_SQL, [input.userId, usageHistoryLocale(input.locale)]);
    await client.query(
      "UPDATE generation_jobs SET status='ready',result=$2::jsonb,error=NULL,updated_at=now() WHERE id=$1 AND status='creating'",
      [input.jobId, JSON.stringify({ track: track ? publicMusicTrack(track) : null, billedTokens, balanceTokens: remaining })]);
    await client.query(
      `UPDATE generation_request_registry SET status='success',error=NULL,response_at=now(),updated_at=now() WHERE id=$1 AND status='running'`,
      [input.jobId],
    );
    return { track, remaining, billedTokens };
  });
  if (!persisted) return;
  await ackAfterPersist(input.jobId);
}
