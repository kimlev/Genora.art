import { AUTO_DURATION_SEC, isMusicHelpSkeleton, lyricsCharLimit, MUSIC_DESCRIPTION_LIMIT, MUSIC_DURATION_STEPS } from "@/lib/catalog/music-studio";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import { integratorMusicLyrics } from "@/lib/server/integrator";
import { requireUser } from "@/lib/server/session";
import { completeGenerationRequest, failGenerationRequest, registerGenerationRequest, updateGenerationRequestMetadata } from "@/lib/server/generation-request-registry";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Недопустимый источник запроса", 403);
  let requestId: string | null = null;
  try {
    const user = await requireUser();
    requestId = await registerGenerationRequest(user.id, "music");
    await updateGenerationRequestMetadata(requestId, { agent: "Music lyrics" });
    const body = await request.json().catch(() => null) as {
      prompt?: unknown;
      mode?: unknown;
      duration?: unknown;
      bpm?: unknown;
      language?: unknown;
      genre?: unknown;
      style?: unknown;
      mood?: unknown;
      purpose?: unknown;
    } | null;
    const prompt = String(body?.prompt ?? "").trim();
    const mode = body?.mode === "instrumental" ? "instrumental" as const : "song" as const;
    if (prompt.length < 10) {
      await failGenerationRequest(requestId, "MUSIC_PROMPT_TOO_SHORT");
      return jsonError("Введите не меньше 10 символов, чтобы помочь модели", 400);
    }
    const rawDuration = Number(body?.duration);
    const pickedDuration = MUSIC_DURATION_STEPS.includes(rawDuration as typeof MUSIC_DURATION_STEPS[number]);
    const duration = mode === "instrumental"
      ? (pickedDuration ? rawDuration : undefined)
      : Math.max(30, Math.min(300, rawDuration || AUTO_DURATION_SEC));
    const bpm = Math.max(66, Math.min(200, Number(body?.bpm) || 133));
    const optional = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : undefined;
    const result = await integratorMusicLyrics({
      prompt,
      mode,
      duration,
      bpm,
      language: typeof body?.language === "string" ? body.language : undefined,
      maxChars: mode === "instrumental" ? MUSIC_DESCRIPTION_LIMIT : lyricsCharLimit(duration ?? AUTO_DURATION_SEC, bpm),
      genre: optional(body?.genre),
      style: optional(body?.style),
      mood: optional(body?.mood),
      purpose: optional(body?.purpose),
    });
    if (mode === "instrumental" && isMusicHelpSkeleton(result.lyrics || "")) {
      await failGenerationRequest(requestId, "MUSIC_LYRICS_EMPTY");
      return jsonError("Не удалось составить описание музыки. Попробуйте ещё раз.", 502);
    }
    await completeGenerationRequest(requestId);
    return Response.json(result);
  } catch (error) {
    if (requestId) await failGenerationRequest(requestId, (error as Error).message || "MUSIC_LYRICS_FAILED").catch(() => undefined);
    if ((error as Error).message === "UNAUTHORIZED") return jsonError("Войдите, чтобы создать текст", 401);
    console.error("music_lyrics_failed", error instanceof Error ? error.message : "unknown");
    return jsonError(error instanceof Error ? error.message : "Не удалось создать подсказку", 502);
  }
}
