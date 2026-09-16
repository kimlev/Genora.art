export const MAX_TRANSCRIPTION_AUDIO_BYTES = 10 * 1024 * 1024;

const ALLOWED_AUDIO_MIMES = new Set(["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav", "audio/x-wav", "audio/aac"]);

export type TranscriptionAudioError = "empty_audio" | "audio_too_large" | "unsupported_audio";

export function decodedBase64Size(value: string): number {
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor(value.length * 3 / 4) - padding);
}

export function validateTranscriptionAudio(audioBase64: string, mime: string): TranscriptionAudioError | null {
  if (!audioBase64) return "empty_audio";
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(audioBase64) || decodedBase64Size(audioBase64) > MAX_TRANSCRIPTION_AUDIO_BYTES) {
    return "audio_too_large";
  }
  if (!ALLOWED_AUDIO_MIMES.has(mime)) return "unsupported_audio";
  return null;
}
