import { after } from "next/server";
import { quoteImage } from "@/lib/server/generation-quote";
import { executeImageJob } from "@/lib/server/image-jobs";
import { insertGenerationJob, publicGenerationJob } from "@/lib/server/generation-jobs";
import {
  SONG_COVER_FORMAT,
  SONG_COVER_MODEL,
  SONG_COVER_PROVIDER,
  SONG_COVER_SIZE,
  SONG_COVER_STYLE,
  SONG_COVER_DESC_MAX,
  SONG_COVER_WORDS_MAX,
  songCoverPrompt,
} from "@/lib/catalog/music-cover";
import { songCoverUsageCopy } from "@/lib/i18n/copy/song-cover-usage-copy";
import { apiAppCopy } from "@/lib/i18n/copy/api-app";
import { requestLocale } from "@/lib/i18n/request-locale";
import { query, withTransaction } from "@/lib/server/db";
import { isSameOrigin, jsonError, jsonTopUpError } from "@/lib/server/http";
import { integratorImageCatalog } from "@/lib/server/integrator";
import { topUpBalanceFromError } from "@/lib/server/paid-balance";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { requireUser } from "@/lib/server/session";
import { createGalleryPreview } from "@/lib/server/image-optimization";
import { usageHistoryLocale } from "@/lib/usage-history-copy";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let locale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError(apiAppCopy(locale).invalidOrigin, 403);
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json().catch(() => null) as { words?: unknown; description?: unknown; lyrics?: unknown; locale?: unknown } | null;
    if (typeof body?.locale === "string") locale = await requestLocale(body.locale);
    const appCopy = apiAppCopy(locale);
    const usage = songCoverUsageCopy(usageHistoryLocale(locale));
    const allowed = await consumeRateLimit({ scope: "image-generation", identifier: user.id, limit: 30, windowSeconds: 60 * 60 });
    if (!allowed) return jsonError(appCopy.imageRateLimited, 429);

    const words = String(body?.words ?? "").trim().slice(0, SONG_COVER_WORDS_MAX);
    const description = String(body?.description ?? body?.lyrics ?? "").trim().slice(0, SONG_COVER_DESC_MAX);

    const catalog = await integratorImageCatalog();
    const catalogModel = catalog.models.find((item) => item.provider === SONG_COVER_PROVIDER && item.id === SONG_COVER_MODEL);
    if (!catalogModel) throw new Error("PROVIDER_NOT_AVAILABLE");
    const setup = await withTransaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [user.id]);
      const track = await client.query<{ id: string; title: string; genre: string | null; style: string | null; mood: string | null; purpose: string | null }>(
        "SELECT id,title,genre,style,mood,purpose FROM music_tracks WHERE id=$1 AND user_id=$2",
        [id, user.id],
      );
      if (!track.rows[0]) throw new Error("TRACK_NOT_FOUND");
      const providerRow = await client.query<{ billing_multiplier: string }>("SELECT billing_multiplier FROM ai_providers WHERE id=$1 AND active=true", [SONG_COVER_PROVIDER]);
      if (!providerRow.rows[0]) throw new Error("PROVIDER_NOT_AVAILABLE");
      const modelRow = await client.query<{ markup_multiplier: string }>("SELECT markup_multiplier FROM ai_models WHERE id=$1 AND active=true", [SONG_COVER_MODEL]);
      const created = await client.query<{ id: string; title: string; updated_at: Date }>(
        `INSERT INTO image_conversations(user_id,title) VALUES($1,$2) RETURNING id,title,updated_at`,
        [user.id, usage.conversationTitle(track.rows[0].title)],
      );
      return {
        track: track.rows[0],
        conversation: created.rows[0],
        multiplier: Number(modelRow.rows[0]?.markup_multiplier ?? providerRow.rows[0].billing_multiplier),
      };
    });
    const prompt = songCoverPrompt({
      words,
      description,
      genre: setup.track.genre,
      style: setup.track.style,
      mood: setup.track.mood,
      purpose: setup.track.purpose,
    });
    if (!prompt.trim()) return jsonError(appCopy.imageParamsRequired, 400);

    const input = {
      userId: user.id, conversationId: setup.conversation.id, conversationTitle: setup.conversation.title,
      locale, multiplier: setup.multiplier, provider: SONG_COVER_PROVIDER, model: SONG_COVER_MODEL,
      prompt, storedPrompt: prompt, size: SONG_COVER_SIZE, format: SONG_COVER_FORMAT, style: SONG_COVER_STYLE,
      count: 1 as const, sourceImageCount: 0, coverTrackId: id,
    };
    const job = await insertGenerationJob({
      userId: user.id, kind: "image", surface: "audio", conversationId: setup.conversation.id,
      title: setup.conversation.title, modelLabel: SONG_COVER_MODEL, payload: input,
      reservationTokens: quoteImage(catalogModel, SONG_COVER_SIZE, undefined, 1, setup.multiplier),
    });
    after(() => executeImageJob({ ...input, jobId: job.id }));
    return Response.json({ job: publicGenerationJob(job), balanceTokens: job.balanceTokens }, { status: 202 });
  } catch (error) {
    const message = (error as Error).message;
    const errorCopy = apiAppCopy(locale);
    if (message === "UNAUTHORIZED") return jsonError(errorCopy.authRequired, 401);
    if (message === "TRACK_NOT_FOUND") return jsonError("Трек не найден", 404);
    if (message === "INSUFFICIENT_BALANCE" || message === "ANSWER_REQUIRES_TOP_UP") {
      return jsonTopUpError(errorCopy.topUpToSeeAnswer, topUpBalanceFromError(error));
    }
    if (message === "IMAGE_BUSY") return jsonError(errorCopy.imageRateLimited, 429);
    if (message === "PROVIDER_NOT_AVAILABLE") return jsonError(errorCopy.imageProviderUnavailable, 409);
    console.error("song_cover_failed", error instanceof Error ? error.message : "unknown");
    return jsonError(errorCopy.imageGenerationFailed, 502);
  }
}

function parseCoverUpload(raw: unknown): { bytes: Buffer; mime: string } | null {
  if (typeof raw !== "string" || !raw.startsWith("data:image/")) return null;
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/i.exec(raw.slice(0, 12_000_000));
  if (!match) return null;
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) return null;
  return { bytes, mime: match[1].toLowerCase() };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const rows = await query<{ cover_upload: Buffer | null; cover_upload_mime: string | null; cover_preview: Buffer | null; cover_preview_mime: string | null }>(
      "SELECT cover_upload,cover_upload_mime,cover_preview,cover_preview_mime FROM music_tracks WHERE id=$1 AND user_id=$2",
      [id, user.id],
    );
    const file = rows[0];
    if (!file?.cover_upload) return new Response(null, { status: 404 });
    const wantsPreview = new URL(request.url).searchParams.get("variant") === "preview";
    let bytes = file.cover_upload;
    let mime = file.cover_upload_mime || "image/jpeg";
    if (wantsPreview) {
      if (file.cover_preview && file.cover_preview_mime) {
        bytes = file.cover_preview;
        mime = file.cover_preview_mime;
      } else {
        const preview = await createGalleryPreview(file.cover_upload, mime);
        if (preview) {
          bytes = preview.bytes;
          mime = preview.mime;
          await query("UPDATE music_tracks SET cover_preview=$3,cover_preview_mime=$4 WHERE id=$1 AND user_id=$2", [id, user.id, bytes, mime]);
        }
      }
    }
    return new Response(new Uint8Array(bytes), {
      headers: {
        "content-type": mime,
        "content-length": String(bytes.byteLength),
        "cache-control": "private, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return new Response(null, { status: 401 });
    return new Response(null, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const locale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError(apiAppCopy(locale).invalidOrigin, 403);
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json().catch(() => null) as { image?: unknown } | null;
    const file = parseCoverUpload(body?.image);
    if (!file) return jsonError("Нужен файл PNG, JPG или WebP.", 400);
    const preview = await createGalleryPreview(file.bytes, file.mime);
    const rows = await query<{ id: string }>(
      "UPDATE music_tracks SET cover_upload=$3,cover_upload_mime=$4,cover_preview=$5,cover_preview_mime=$6,updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING id",
      [id, user.id, file.bytes, file.mime, preview?.bytes ?? null, preview?.mime ?? null],
    );
    if (!rows[0]) return jsonError("Трек не найден", 404);
    return Response.json({ coverUrl: `/api/music/tracks/${id}/cover?variant=preview&v=${Date.now()}` });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(apiAppCopy(locale).authRequired, 401);
    return jsonError("Не удалось сохранить обложку", 500);
  }
}
