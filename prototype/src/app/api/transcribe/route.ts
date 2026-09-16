import { stripDataUrlBase64 } from "@/lib/chat-attachments";
import { jsonError, isSameOrigin } from "@/lib/server/http";
import { integratorTranscribe } from "@/lib/server/integrator";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { requireUser } from "@/lib/server/session";
import { validateTranscriptionAudio } from "@/lib/transcription-policy";
import { cleanAudioMime, voiceFilename } from "@/lib/voice-recorder";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("forbidden", 403);
  try {
    const user = await requireUser();
    const allowed = await consumeRateLimit({ scope: "transcribe", identifier: user.id, limit: 30, windowSeconds: 60 * 60 });
    if (!allowed) return jsonError("rate_limited", 429);
    const body = await request.json().catch(() => null) as {
      audioBase64?: unknown;
      mime?: unknown;
      filename?: unknown;
    } | null;
    const audioBase64 = typeof body?.audioBase64 === "string" ? stripDataUrlBase64(body.audioBase64) : "";
    const mime = typeof body?.mime === "string" ? cleanAudioMime(body.mime) : "audio/webm";
    const validationError = validateTranscriptionAudio(audioBase64, mime);
    if (validationError) return jsonError(validationError, validationError === "empty_audio" ? 400 : validationError === "unsupported_audio" ? 415 : 413);
    const text = await integratorTranscribe({
      audioBase64,
      mime,
      filename: typeof body?.filename === "string" ? body.filename : voiceFilename(mime),
    });
    return Response.json({ text });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return jsonError("unauthorized", 401);
    const status = error instanceof Error && "statusCode" in error ? Number((error as Error & { statusCode: number }).statusCode) : 502;
    return jsonError("transcribe_failed", Number.isFinite(status) ? status : 502);
  }
}
