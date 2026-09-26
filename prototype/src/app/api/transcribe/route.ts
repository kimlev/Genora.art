import { stripDataUrlBase64 } from "@/lib/chat-attachments";
import { jsonError, isSameOrigin } from "@/lib/server/http";
import { integratorTranscribe } from "@/lib/server/integrator";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { requireUser } from "@/lib/server/session";
import { validateTranscriptionAudio } from "@/lib/transcription-policy";
import { cleanAudioMime, voiceFilename } from "@/lib/voice-recorder";
import { completeGenerationRequest, failGenerationRequest, registerGenerationRequest, updateGenerationRequestMetadata } from "@/lib/server/generation-request-registry";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("forbidden", 403);
  let requestId: string | null = null;
  try {
    const user = await requireUser();
    requestId = await registerGenerationRequest(user.id, "chat");
    await updateGenerationRequestMetadata(requestId, { agent: "Speech-to-text" });
    const allowed = await consumeRateLimit({ scope: "transcribe", identifier: user.id, limit: 30, windowSeconds: 60 * 60 });
    if (!allowed) {
      await failGenerationRequest(requestId, "TRANSCRIBE_RATE_LIMITED");
      return jsonError("rate_limited", 429);
    }
    const body = await request.json().catch(() => null) as {
      audioBase64?: unknown;
      mime?: unknown;
      filename?: unknown;
    } | null;
    const audioBase64 = typeof body?.audioBase64 === "string" ? stripDataUrlBase64(body.audioBase64) : "";
    const mime = typeof body?.mime === "string" ? cleanAudioMime(body.mime) : "audio/webm";
    const validationError = validateTranscriptionAudio(audioBase64, mime);
    if (validationError) {
      await failGenerationRequest(requestId, validationError);
      return jsonError(validationError, validationError === "empty_audio" ? 400 : validationError === "unsupported_audio" ? 415 : 413);
    }
    const text = await integratorTranscribe({
      audioBase64,
      mime,
      filename: typeof body?.filename === "string" ? body.filename : voiceFilename(mime),
    });
    await completeGenerationRequest(requestId);
    return Response.json({ text, requestId });
  } catch (error) {
    if (requestId) await failGenerationRequest(requestId, (error as Error).message || "TRANSCRIBE_FAILED").catch(() => undefined);
    if (error instanceof Error && error.message === "UNAUTHORIZED") return jsonError("unauthorized", 401);
    const status = error instanceof Error && "statusCode" in error ? Number((error as Error & { statusCode: number }).statusCode) : 502;
    return jsonError("transcribe_failed", Number.isFinite(status) ? status : 502);
  }
}
