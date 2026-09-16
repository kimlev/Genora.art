/** Общий принцип микрофона: тот же формат, что уже работает в чате. */

export const MIN_VOICE_BYTES = 200;
export const VOICE_RECORDER_TIMESLICE_MS = 250;

const RECORDER_MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"] as const;

export function recorderMime(): string | undefined {
  return RECORDER_MIME_CANDIDATES.find((type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type));
}

export function cleanAudioMime(mime: string): string {
  return mime.split(";")[0]?.trim() || "audio/webm";
}

export function voiceFilename(mime: string): string {
  const value = cleanAudioMime(mime);
  if (value.includes("mp4") || value.includes("m4a") || value.includes("aac")) return "voice.m4a";
  if (value.includes("ogg") && !value.includes("webm")) return "voice.ogg";
  return "voice.webm";
}

export function fileDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("file_read_failed"));
    reader.onerror = () => reject(reader.error ?? new Error("file_read_failed"));
    reader.readAsDataURL(file);
  });
}

export function flushAndStopRecorder(recorder: MediaRecorder | null | undefined): boolean {
  if (recorder?.state !== "recording") return false;
  try { recorder.requestData(); } catch { /* Safari may omit requestData */ }
  recorder.stop();
  return true;
}
