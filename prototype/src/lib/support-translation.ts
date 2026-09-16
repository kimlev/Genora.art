export const TRANSLATION_PROMPT = [
  "Переведи весь текст на русский разговорный язык.",
  "Ответ должен быть только на русском, кириллицей.",
  "Запрещено переводить на китайский, английский или любой другой язык.",
  "Не добавляй пояснения, заголовки, кавычки и комментарии — только перевод.",
].join(" ");

export function isTextChatModelId(id: string): boolean {
  const value = id.trim().toLowerCase();
  if (!value) return false;
  if (value.startsWith("video:") || value.startsWith("image:") || value.startsWith("music:")) return false;
  if (value.includes("video") || value.includes("image") || value.includes("audio")) return false;
  return true;
}

export function isCheapTranslationModelId(id: string): boolean {
  if (!isTextChatModelId(id)) return false;
  const value = id.trim().toLowerCase();
  if (value.includes("lite")) return false;
  if (value.includes("flash") || value.includes("haiku")) return true;
  return value.includes("mini") && !value.includes("minimax");
}

export function looksLikeRussian(text: string): boolean {
  const cyrillic = (text.match(/[А-Яа-яЁё]/g) ?? []).length;
  const cjk = (text.match(/[\u4E00-\u9FFF]/g) ?? []).length;
  return cyrillic >= 4 && cyrillic > cjk;
}

export function pickCheapestTextModel<T extends { id: string; cost: number }>(models: T[]): T | undefined {
  return models
    .filter((model) => isTextChatModelId(model.id))
    .sort((left, right) => left.cost - right.cost)[0];
}

export function translationUsageTitle(publicId: string): string {
  return `перевод (${publicId})`;
}

export function sourceTextForTranslation(content: string): string {
  const stripped = content
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.slice(0, 20_000);
}
