/** Форматы и размер, которые Gemini принимает как inlineData. */
export const GEMINI_VIDEO_MIMES = new Set([
  "video/mp4",
  "video/mpeg",
  "video/mov",
  "video/quicktime",
  "video/avi",
  "video/x-flv",
  "video/mpg",
  "video/webm",
  "video/wmv",
  "video/3gpp",
]);

/** Gemini inline: до 100 МБ исходного файла. После base64 тело ~133 МБ — nginx/API 150 МБ. */
export const MAX_CHAT_VIDEO_MB = 100;
export const MAX_CHAT_VIDEO_BYTES = MAX_CHAT_VIDEO_MB * 1024 * 1024;

const VIDEO_EXT = /\.(mp4|mov|mpeg|mpg|avi|webm|wmv|flv|3gp|3gpp)$/i;

const MIME_BY_EXT: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  mpeg: "video/mpeg",
  mpg: "video/mpg",
  avi: "video/avi",
  webm: "video/webm",
  wmv: "video/wmv",
  flv: "video/x-flv",
  "3gp": "video/3gpp",
  "3gpp": "video/3gpp",
};

export function isGeminiVideoFile(name: string, mime: string): boolean {
  const type = mime.trim().toLowerCase().split(";")[0];
  if (GEMINI_VIDEO_MIMES.has(type)) return true;
  return VIDEO_EXT.test(name);
}

export function geminiVideoMime(name: string, mime: string): string {
  const type = mime.trim().toLowerCase().split(";")[0];
  if (GEMINI_VIDEO_MIMES.has(type)) return type;
  const ext = name.toLowerCase().split(".").pop() ?? "";
  return MIME_BY_EXT[ext] ?? "video/mp4";
}

export function chatModelAcceptsVideo(provider: string, modelId: string): boolean {
  if (/gemma/i.test(modelId)) return false;
  if (/google/i.test(provider) && (modelId === "auto" || /gemini/i.test(modelId))) return true;
  return /gemini/i.test(modelId);
}

export function chatVideoCopy(locale: string) {
  if (locale === "ru") {
    return {
      upload: "Загрузить видео",
      tooLarge: (name: string) => `Файл «${name}» больше ${MAX_CHAT_VIDEO_MB} МБ.`,
      notVideo: (name: string) => `«${name}» не является видео, которое принимает Gemini.`,
      videoOnlyGemini: "Видео можно отправить только модели Google Gemini.",
      videoRequired: "Загрузите видео — VideoPromt собирает промпт только по ролику.",
    };
  }
  return {
    upload: "Upload video",
    tooLarge: (name: string) => `“${name}” is larger than ${MAX_CHAT_VIDEO_MB} MB.`,
    notVideo: (name: string) => `“${name}” is not a video Gemini accepts.`,
    videoOnlyGemini: "Video can be sent only to a Google Gemini model.",
    videoRequired: "Upload a video — VideoPromt writes a prompt only from the clip.",
  };
}
