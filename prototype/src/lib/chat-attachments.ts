import { chatUiCopy } from "@/lib/i18n/copy/chat-ui";
import { chatVideoCopy, geminiVideoMime, isGeminiVideoFile, MAX_CHAT_VIDEO_BYTES } from "@/lib/chat-video";
import type { Locale } from "@/lib/i18n";

/** `data:audio/webm;codecs=opus;base64,...` — резать только до запятой, иначе файл пустой. */
export function stripDataUrlBase64(value: string): string {
  return value.replace(/^data:[^,]+,/i, "").trim();
}

export const MAX_CHAT_ATTACHMENTS = 8;
export const MAX_CHAT_ATTACHMENT_BYTES = 12 * 1024 * 1024;
export const MAX_CHAT_ATTACHMENTS_TOTAL_BYTES = 20 * 1024 * 1024;

export type ChatAttachmentKind = "image" | "file" | "audio" | "video";

export type ChatAttachmentPayload = {
  name: string;
  mime: string;
  kind: ChatAttachmentKind;
  dataBase64: string;
};

export type ChatAttachmentMeta = Omit<ChatAttachmentPayload, "dataBase64"> & { size: number };

function estimatedBase64Bytes(value: string): number {
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor(value.length * 3 / 4) - padding);
}

export function parseChatAttachments(value: unknown, locale: Locale = "en"): ChatAttachmentPayload[] {
  if (value === undefined || value === null) return [];
  const copy = chatUiCopy(locale);
  if (!Array.isArray(value) || value.length > MAX_CHAT_ATTACHMENTS) throw new Error(`ATTACHMENT_INVALID:${copy.attachmentsMax(MAX_CHAT_ATTACHMENTS)}`);
  let totalBytes = 0;
  let videoBytes = 0;
  return value.map((entry) => {
    if (!entry || typeof entry !== "object") throw new Error(`ATTACHMENT_INVALID:${copy.attachmentInvalid}`);
    const item = entry as Record<string, unknown>;
    const kind = item.kind === "image" || item.kind === "file" || item.kind === "audio" || item.kind === "video" ? item.kind : null;
    const name = String(item.name ?? "").replace(/[\\/]/g, "_").trim().slice(0, 255);
    const mime = String(item.mime ?? "application/octet-stream").trim().toLowerCase().split(";")[0].slice(0, 160);
    const dataBase64 = stripDataUrlBase64(String(item.dataBase64 ?? ""));
    if (!kind || !name || !dataBase64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(dataBase64)) throw new Error(`ATTACHMENT_INVALID:${copy.attachmentInvalid}`);
    const bytes = estimatedBase64Bytes(dataBase64);
    const fileLimit = kind === "video" ? MAX_CHAT_VIDEO_BYTES : MAX_CHAT_ATTACHMENT_BYTES;
    const videoCopy = chatVideoCopy(locale);
    if (!bytes || bytes > fileLimit) throw new Error(`ATTACHMENT_INVALID:${kind === "video" ? videoCopy.tooLarge(name) : copy.attachmentTooLarge(name)}`);
    if (kind === "video") {
      videoBytes += bytes;
      if (videoBytes > MAX_CHAT_VIDEO_BYTES) throw new Error(`ATTACHMENT_INVALID:${videoCopy.tooLarge(name)}`);
    } else {
      totalBytes += bytes;
      if (totalBytes > MAX_CHAT_ATTACHMENTS_TOTAL_BYTES) throw new Error(`ATTACHMENT_INVALID:${copy.attachmentsTotalTooLarge}`);
    }
    if (kind === "image" && !mime.startsWith("image/")) throw new Error(`ATTACHMENT_INVALID:${copy.attachmentNotImage(name)}`);
    if (kind === "audio" && !mime.startsWith("audio/") && !/\.(?:webm|mp3|m4a|wav|ogg|mp4)$/i.test(name)) throw new Error(`ATTACHMENT_INVALID:${copy.attachmentNotAudio(name)}`);
    if (kind === "video" && !isGeminiVideoFile(name, mime)) throw new Error(`ATTACHMENT_INVALID:${videoCopy.notVideo(name)}`);
    return { name, mime: kind === "video" ? geminiVideoMime(name, mime) : mime, kind, dataBase64 };
  });
}

export function attachmentMeta(attachments: ChatAttachmentPayload[]): ChatAttachmentMeta[] {
  return attachments.map((item) => ({
    name: item.name,
    mime: item.mime,
    kind: item.kind,
    size: estimatedBase64Bytes(item.dataBase64),
  }));
}

const VIDEO_TOKENS_PER_SEC = 300;
const VIDEO_BYTES_PER_SEC = 150_000;
const IMAGE_INPUT_TOKENS = 258;

/** Если провайдер не вернул токены за файл, оцениваем вход по размеру вложения. */
export function resolveReportedChatUsage(input: {
  promptTokens: number;
  completionTokens: number;
  estimatedInputTokens: number;
  answerLength?: number;
}) {
  const prompt = Number.isFinite(input.promptTokens) ? Math.max(0, input.promptTokens) : 0;
  const completion = Number.isFinite(input.completionTokens) ? Math.max(0, input.completionTokens) : 0;
  const estimated = Number.isFinite(input.estimatedInputTokens) ? Math.max(0, input.estimatedInputTokens) : 0;
  const inputTokens = prompt > 0 ? prompt : estimated;
  const outputTokens = completion > 0
    ? completion
    : (estimated > 0 && (input.answerLength ?? 0) > 0 ? Math.max(32, Math.round((input.answerLength ?? 0) / 4)) : 0);
  return { inputTokens, outputTokens, hasMedia: estimated > 0 };
}

export function estimateAttachmentInputTokens(
  attachments: ChatAttachmentPayload[] = [],
  imageDataUrls: string[] = [],
): number {
  let tokens = 0;
  for (const item of attachments) {
    const bytes = estimatedBase64Bytes(item.dataBase64);
    if (item.kind === "video") {
      const seconds = Math.max(1, Math.min(180, bytes / VIDEO_BYTES_PER_SEC));
      tokens += Math.round(seconds * VIDEO_TOKENS_PER_SEC);
    } else if (item.kind === "image") {
      tokens += IMAGE_INPUT_TOKENS;
    } else if (item.kind === "file") {
      tokens += Math.max(200, Math.round(bytes / 4));
    }
  }
  return tokens + imageDataUrls.length * IMAGE_INPUT_TOKENS;
}
