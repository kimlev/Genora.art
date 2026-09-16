/** Политика чата: тяжёлые модели и глубокий режим ждут полный ответ. */

export const HEAVY_CHAT_SLOTS = 3;
export const INTEGRATOR_CHAT_SLOTS = 12;
export const IMAGE_GENERATION_SLOTS = 4;
/** Одновременно разбираем не больше трёх больших видео; остальные ждут в очереди. */
export const VIDEO_CHAT_SLOTS = 3;
export const LARGE_CHAT_BODY_BYTES = 20 * 1024 * 1024;

export const EXTENDED_CHAT_TIMEOUT_MS = 50 * 60_000;
export const LONG_CHAT_TIMEOUT_MS = 12 * 60_000;
export const NORMAL_CHAT_TIMEOUT_MS = 12 * 60_000;
/** Общий потолок, если маршрут не передал свой лимит. Тяжёлый запрос его перекрывает. */
export const GENERAL_CHAT_CEILING_MS = EXTENDED_CHAT_TIMEOUT_MS;
export const FALLBACK_CHAT_TIMEOUT_MS = 60_000;
export const HEAVY_SLOT_WAIT_MS = 25_000;
export const INTEGRATOR_SLOT_WAIT_MS = 8_000;
export const IMAGE_SLOT_WAIT_MS = 15_000;
/** Ждём слот столько же, сколько клиент ждёт ответ модели. */
export const VIDEO_CHAT_SLOT_WAIT_MS = EXTENDED_CHAT_TIMEOUT_MS;

export const LONG_OUTPUT_TOKENS = 32_768;
export const NORMAL_OUTPUT_TOKENS = 8_192;

/** @deprecated используйте LONG_CHAT_TIMEOUT_MS */
export const HEAVY_CHAT_TIMEOUT_MS = LONG_CHAT_TIMEOUT_MS;

const HEAVY_MODEL = /(?:^|[-_.])(pro|o1|o3|o4)(?:[-_.]|$)/i;

export function isGpt55ProModel(modelId: string): boolean {
  return /(?:^|[-_.])gpt-5\.5-pro(?:[-_.]|$)/i.test(modelId.trim());
}

/** GPT-5.5 без Pro — среднее размышление. */
export function isGpt55ChatModel(modelId: string): boolean {
  const id = modelId.trim();
  return /(?:^|[-_.])gpt-5\.5(?:[-_.]|$)/i.test(id) && !isGpt55ProModel(id);
}

export function isGpt55FamilyModel(modelId: string): boolean {
  return isGpt55ProModel(modelId) || isGpt55ChatModel(modelId);
}

export function isGemmaChatModel(modelId: string): boolean {
  return /^gemma[-_]/i.test(modelId.trim());
}

/** Gemma не умеет thinking — глубину не показываем и не передаём. */
export function chatModelShowsDepthPicker(modelId: string, hasReasoningCapability?: unknown): boolean {
  if (isGemmaChatModel(modelId)) return false;
  if (modelId === "auto") return true;
  if (hasReasoningCapability === undefined) return true;
  return Boolean(hasReasoningCapability);
}

/** Глубину больше не режем: Pro 5.5 снова может быть средней и глубокой. */
export function clampChatDepthForModel<T extends string>(_modelId: string, depth: T): T {
  return depth;
}

export function isHeavyChatModel(modelId: string): boolean {
  return HEAVY_MODEL.test(modelId) || /5\.5-pro|gpt-5-pro/i.test(modelId);
}

export function isHeavyChatRequest(modelId: string, depth: string): boolean {
  return depth === "deep" || isHeavyChatModel(modelId);
}

export function chatAttemptTimeoutMs(modelId: string, _depth?: string): number {
  return isGpt55FamilyModel(modelId) ? EXTENDED_CHAT_TIMEOUT_MS : LONG_CHAT_TIMEOUT_MS;
}

export function chatOutputTokenLimit(_modelId?: string, _depth?: string): number {
  return LONG_OUTPUT_TOKENS;
}

export function canUseChatFallback(_requestedModelId: string): boolean {
  return false;
}

export function shouldFallbackChat(_error?: unknown, _requestedModelId = "auto"): boolean {
  return false;
}
