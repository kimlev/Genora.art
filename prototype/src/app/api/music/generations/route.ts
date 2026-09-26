import { after } from "next/server";
import { AUTO_DURATION_SEC, DEFAULT_MUSIC_MULTIPLIER, looksLikeMusicVideoBytes, lyricsCharLimit, MUSIC_VIDEO_MAX_BYTES, MUSIC_VIDEO_MAX_SEC, MUSIC_VIDEO_MIN_SEC, musicModelMultiplier } from "@/lib/catalog/music-studio";
import { quoteMusic } from "@/lib/server/generation-quote";
import { integratorMusicCatalog } from "@/lib/server/integrator";
import { query, withTransaction } from "@/lib/server/db";
import { insertGenerationJob, markGenerationJobFailed, publicGenerationJob, reserveGenerationJobTokens, updateGenerationJobDetails } from "@/lib/server/generation-jobs";
import { failGenerationRequest, registerGenerationRequest, updateGenerationRequestMetadata } from "@/lib/server/generation-request-registry";
import { executeMusicJob } from "@/lib/server/music-jobs";
import { topUpBalanceFromError } from "@/lib/server/paid-balance";
import { isSameOrigin, jsonError, jsonTopUpError } from "@/lib/server/http";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { requireUser } from "@/lib/server/session";
import { requestLocale } from "@/lib/i18n/request-locale";

export const runtime = "nodejs";
export const maxDuration = 720;

type TrackRow = {
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
  billed_tokens: string;
  created_at: Date;
};

function parseClientMusicVideo(dataUrl: string) {
  const match = /^data:(video\/(?:mp4|quicktime|webm|x-m4v));base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl);
  if (!match) return null;
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > MUSIC_VIDEO_MAX_BYTES) return null;
  if (!looksLikeMusicVideoBytes(bytes.subarray(0, 16))) return null;
  const mime = match[1].toLowerCase() === "video/x-m4v" ? "video/mp4" : match[1].toLowerCase();
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

function publicTrack(row: TrackRow) {
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
    createdAt: row.created_at.toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const archived = new URL(request.url).searchParams.get("archived") === "1";
    const rows = await query<TrackRow>(`SELECT id,request_id,provider,model_id,model_label,title,mode,genre,style,mood,purpose,duration_sec,lyrics,prompt,asset_id,mime,formats,cover_asset_id,(cover_upload IS NOT NULL) AS has_cover_upload,billed_tokens,created_at
      FROM music_tracks WHERE user_id=$1 AND deleted_at IS ${archived ? "NOT NULL" : "NULL"} ORDER BY created_at DESC LIMIT 200`, [user.id]);
    return Response.json({ tracks: rows.map(publicTrack) });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError("Войдите, чтобы открыть галерею", 401);
    console.error("music_history_failed", error instanceof Error ? error.message : "unknown");
    return jsonError("Не удалось загрузить треки", 500);
  }
}

export async function POST(request: Request) {
  const locale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError("Недопустимый источник запроса", 403);
  let trackedJobId: string | null = null;
  let requestId: string | null = null;
  let workScheduled = false;
  try {
    const user = await requireUser();
    requestId = await registerGenerationRequest(user.id, "music");
    const allowed = await consumeRateLimit({ scope: "music-generation", identifier: user.id, limit: 20, windowSeconds: 60 * 60 });
    if (!allowed) throw new Error("MUSIC_BUSY");
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const provider = String(body?.provider ?? "").slice(0, 80);
    const model = String(body?.model ?? "").slice(0, 160);
    const mode = body?.mode === "instrumental" ? "instrumental" as const : "song" as const;
    const prompt = String(body?.prompt ?? "").trim().slice(0, 4_000);
    const lyrics = String(body?.lyrics ?? "").trim().slice(0, 8_000);
    const title = String(body?.title ?? "").trim().slice(0, 100);
    const genre = String(body?.genre ?? "").trim().slice(0, 4000);
    const style = String(body?.style ?? "").trim().slice(0, 4000);
    const mood = String(body?.mood ?? "").trim().slice(0, 4000);
    const purpose = String(body?.purpose ?? "").trim().slice(0, 4000);
    const vocal = ["auto", "female", "male", "duet"].includes(String(body?.vocal ?? ""))
      ? String(body?.vocal) as "auto" | "female" | "male" | "duet"
      : "auto";
    const language = String(body?.language ?? "auto").slice(0, 16);
    const autoDuration = body?.autoDuration === true;
    const bpm = Math.max(66, Math.min(200, Number(body?.bpm) || 133));
    const inputVideo = parseClientMusicVideo(String(body?.inputVideo ?? body?.input_video ?? ""));
    await updateGenerationRequestMetadata(requestId, { provider, modelId: model, modelLabel: model });
    if (String(body?.inputVideo ?? body?.input_video ?? "").trim() && !inputVideo) {
      throw new Error("MUSIC_VIDEO_INVALID");
    }
    const duration = autoDuration && !inputVideo
      ? undefined
      : Math.max(inputVideo ? MUSIC_VIDEO_MIN_SEC : 30, Math.min(inputVideo ? MUSIC_VIDEO_MAX_SEC : 300, Math.round(Number(body?.duration) || 120)));
    if (!provider || !model || (!prompt && !lyrics && !inputVideo)) throw new Error("MUSIC_PARAMS_INVALID");
    if (mode === "song" && lyrics) {
      const limit = lyricsCharLimit(duration ?? AUTO_DURATION_SEC, bpm);
      if (lyrics.length > limit) throw new Error(`MUSIC_LYRICS_TOO_LONG:${limit}`);
    }

    const trackedJob = await insertGenerationJob({
      id: requestId,
      userId: user.id,
      kind: "music",
      surface: "audio",
      title: title || prompt.slice(0, 80) || "Трек",
      modelLabel: model,
      deferReservation: true,
      payload: { locale, provider, model, mode, prompt, lyrics, title, genre, style, mood, purpose, bpm, duration, vocal, language },
    });
    trackedJobId = trackedJob.id;

    const catalog = await integratorMusicCatalog();
    const catalogModel = catalog.find((item) => item.provider === provider && item.id === model);
    if (!catalogModel || catalogModel.available === false || !catalogModel.modes.includes(mode)) throw new Error("PROVIDER_NOT_AVAILABLE");
    const setup = await withTransaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [user.id]);
      const providerRow = await client.query<{ billing_multiplier: string }>("SELECT billing_multiplier FROM ai_providers WHERE id=$1 AND active=true", [provider]);
      const modelRow = await client.query<{ markup_multiplier: string }>("SELECT markup_multiplier FROM ai_models WHERE id=$1 AND active=true", [`music:${provider}:${model}`]);
      return {
        multiplier: musicModelMultiplier(provider, Number(modelRow.rows[0]?.markup_multiplier ?? providerRow.rows[0]?.billing_multiplier ?? DEFAULT_MUSIC_MULTIPLIER)),
      };
    });

    await updateGenerationJobDetails(trackedJob.id, {
      modelLabel: catalogModel.label,
      payload: {
        locale,
        multiplier: setup.multiplier,
        mode,
        prompt: prompt || (inputVideo ? "Score this video to picture." : ""),
        lyrics,
        title,
        genre,
        style,
        mood,
        purpose,
        bpm,
        duration,
        vocal,
        language,
      },
    });
    await updateGenerationRequestMetadata(requestId, { provider, modelId: model, modelLabel: catalogModel.label });
    const balanceTokens = await reserveGenerationJobTokens(trackedJob.id, user.id, quoteMusic(catalogModel, duration, setup.multiplier));
    const job = { ...trackedJob, model_label: catalogModel.label, balanceTokens };
    after(() => executeMusicJob({
      jobId: job.id,
      userId: user.id,
      locale,
      multiplier: setup.multiplier,
      provider,
      model,
      mode,
      prompt: prompt || (inputVideo ? "Score this video to picture." : ""),
      lyrics: lyrics || undefined,
      title: title || undefined,
      genre: genre || undefined,
      style: style || undefined,
      mood: mood || undefined,
      purpose: purpose || undefined,
      bpm,
      duration,
      vocal: mode === "song" ? vocal : undefined,
      language,
      inputVideo: inputVideo || undefined,
    }));
    workScheduled = true;
    return Response.json({ job: publicGenerationJob(job), balanceTokens: job.balanceTokens }, { status: 202 });
  } catch (error) {
    const message = (error as Error).message;
    if (trackedJobId && !workScheduled) {
      await markGenerationJobFailed(trackedJobId, message || "MUSIC_REQUEST_FAILED").catch((trackingError) => {
        console.error("music_request_tracking_failed", trackedJobId, trackingError instanceof Error ? trackingError.message : "unknown");
      });
    }
    if (requestId) await failGenerationRequest(requestId, message || "MUSIC_REQUEST_FAILED").catch(() => {});
    if (message === "UNAUTHORIZED") return jsonError("Войдите, чтобы создать трек", 401);
    if (message === "INSUFFICIENT_BALANCE" || message === "ANSWER_REQUIRES_TOP_UP") {
      return jsonTopUpError("Пополните баланс, чтобы создать трек", topUpBalanceFromError(error));
    }
    if (message === "MUSIC_BUSY") return jsonError("Сейчас очередь генерации занята. Попробуйте ещё раз.", 429);
    if (message === "MUSIC_VIDEO_INVALID") return jsonError("Нужен ролик MP4, MOV или WebM до 70 МБ", 400);
    if (message === "MUSIC_PARAMS_INVALID") return jsonError("Заполните описание или текст песни", 400);
    if (message.startsWith("MUSIC_LYRICS_TOO_LONG:")) return jsonError(`Текст длиннее ${message.split(":")[1]} символов для выбранного хронометража`, 400);
    if (/not available in your current location|available-regions|Lyria недоступна/i.test(message)) {
      return jsonError("Google Lyria недоступна из региона сервера. Выберите ElevenLabs, Mureka или MiniMax.", 400);
    }
    console.error("music_generation_failed", error instanceof Error ? error.message : "unknown");
    return jsonError(error instanceof Error ? error.message : "Не удалось создать трек", 502);
  }
}
