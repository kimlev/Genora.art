import "server-only";

import { randomUUID } from "node:crypto";
import { integratorRequestTimeoutMs, REQUEST_TIMEOUT_MS } from "@/lib/integrator-timeout";
import { isPipeBreak, normalizeIntegratorUsageItem, type IntegratorUsageItem } from "@/lib/integrator-usage";
import { isWarehouseTerminal, warehousePollDelay } from "@/lib/integrator-warehouse";
import { createResilientCache } from "@/lib/resilient-cache";

export { integratorRequestTimeoutMs };
export type { IntegratorUsageItem };

function configuration() {
  const baseUrl = process.env.INTEGRATOR_BASE_URL?.trim().replace(/\/$/, "");
  const apiKey = process.env.INTEGRATOR_API_KEY?.trim();
  if (!baseUrl || !apiKey) throw new Error("INTEGRATOR_NOT_CONFIGURED");
  return { baseUrl, apiKey };
}

async function request<T>(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { baseUrl, apiKey } = configuration();
  const { timeoutMs = REQUEST_TIMEOUT_MS, ...fetchInit } = init;
  const response = await fetch(`${baseUrl}${path}`, {
    ...fetchInit,
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      accept: "application/json",
      authorization: `Bearer ${apiKey}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => null) as (T & { message?: string; error?: string }) | null;
  if (!response.ok || !payload) {
    const error = new Error(payload?.message || payload?.error || `IntegratorAI HTTP ${response.status}`) as Error & { statusCode: number };
    error.statusCode = response.status >= 400 && response.status < 500 ? response.status : 502;
    throw error;
  }
  return payload;
}

export type IntegratorHold = {
  request_id: string;
  status: string;
  held?: boolean;
  acked?: boolean;
  expired?: boolean;
  modality?: string;
  error?: string | null;
  result?: unknown;
  data?: Array<{ url: string; mime: string; duration_sec?: number | null }>;
};

export async function integratorGetRequest(requestId: string): Promise<IntegratorHold> {
  return request<IntegratorHold>(`/v1/requests/${encodeURIComponent(requestId)}`);
}

export async function integratorListRequests(): Promise<IntegratorHold[]> {
  const response = await request<{ items?: IntegratorHold[] }>("/v1/requests");
  return response.items ?? [];
}

export async function integratorAckRequest(requestId: string): Promise<void> {
  await request(`/v1/requests/${encodeURIComponent(requestId)}/ack`, { method: "POST" });
}

export async function waitForWarehouseResult<T>(requestId: string, maxMs = 12 * 60 * 60_000): Promise<T> {
  const started = Date.now();
  for (;;) {
    try {
      const hold = await integratorGetRequest(requestId);
      if (hold.status === "ready") return (hold.result ?? hold) as T;
      if (hold.status === "error") {
        const error = new Error(hold.error || "request_failed") as Error & { statusCode: number; requestId: string };
        error.statusCode = 502;
        error.requestId = requestId;
        throw error;
      }
      if (hold.status === "expired") {
        const error = new Error("REQUEST_EXPIRED") as Error & { statusCode: number; requestId: string };
        error.statusCode = 410;
        error.requestId = requestId;
        throw error;
      }
      if (isWarehouseTerminal(hold.status) && hold.status !== "ready") {
        const error = new Error(hold.error || hold.status) as Error & { requestId: string };
        error.requestId = requestId;
        throw error;
      }
    } catch (error) {
      const status = error && typeof error === "object" && "statusCode" in error
        ? Number((error as { statusCode: number }).statusCode)
        : 0;
      if (status === 404 && Date.now() - started > 60_000) throw error;
      if (status && status !== 404 && !isPipeBreak(error)) throw error;
    }
    if (Date.now() - started > maxMs) {
      const error = new Error("WAREHOUSE_WAIT_TIMEOUT") as Error & { requestId: string };
      error.requestId = requestId;
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, warehousePollDelay(Date.now() - started)));
  }
}

async function requestHeld<T>(path: string, init: RequestInit & { timeoutMs?: number }, requestId: string): Promise<T> {
  try {
    return await request<T>(path, {
      ...init,
      headers: {
        "X-Request-ID": requestId,
        ...init.headers,
      },
    });
  } catch (error) {
    const status = error && typeof error === "object" && "statusCode" in error
      ? Number((error as { statusCode: number }).statusCode)
      : 0;
    if (status === 409 || isPipeBreak(error)) return waitForWarehouseResult<T>(requestId);
    throw error;
  }
}

export type IntegratorVideoInputAnalysis = {
  mode: string;
  analyzer: string | null;
  accepts_video_fps: boolean;
  video_fps: {
    min_inclusive?: number;
    min_exclusive?: number;
    max_inclusive: number;
    default: number;
  } | null;
  accepts_video_media_resolution: boolean;
  video_media_resolution_values: string[];
  default_video_media_resolution: "low" | "medium" | "high" | null;
  final_model_receives?: string;
};

export type IntegratorModel = {
  provider: string;
  id: string;
  label: string;
  configured: boolean;
  temperature: { mode: string; value: number; min?: number; max?: number };
  top_p: { mode: string; value: number; min?: number; max?: number };
  reasoning: { label?: string; defaultValue?: string; options?: Array<{ value: string; label: string }> } | null;
  pricing: {
    unit_tokens: number;
    input_per_1m_usd: number;
    cached_input_per_1m_usd: number | null;
    output_per_1m_usd: number;
    source: string;
    source_url: string;
    verified_at: string;
    valid_until: string | null;
  };
  average_request_cost_usd?: number | null;
  video_input_analysis?: IntegratorVideoInputAnalysis;
  usage_policy?: {
    partner_internal_use?: boolean;
    resale_allowed?: boolean;
    policy?: string;
  };
};

export type IntegratorChatResult = {
  id: string;
  provider: string;
  model: string;
  choices: Array<{ message: { role: "assistant"; content: string } }>;
  usage: {
    prompt_tokens: number;
    cached_prompt_tokens: number;
    completion_tokens: number;
    thinking_tokens: number;
    total_tokens: number;
    cost_usd: number;
    average_request_cost_usd?: number | null;
    tool_cost_usd: number;
    web_search_calls: number;
    input_per_1m_usd: number;
    cached_input_per_1m_usd: number | null;
    output_per_1m_usd: number;
  };
  meta: {
    model_label: string;
    latency_ms: number;
    sources?: Array<{ title?: string; url?: string }>;
    attachments?: Array<{ filename: string; mime: string; kind: string; bytes: number; extracted_characters: number }>;
  };
};

export type IntegratorMessageContent = string | Array<
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; mime: string; data_base64: string } }
>;

export type IntegratorImageModel = {
  provider: string;
  provider_label: string;
  id: string;
  label: string;
  description: string;
  reasoning: { label: string; defaultValue: string; options: Array<{ value: string; label: string }> } | null;
  sizes: string[];
  formats: string[];
  formats_by_size: Record<string, string[]> | null;
  styles: string[];
  max_reference_images?: number;
  input_image: {
    supported: boolean;
    provider_max_file_bytes: number | null;
    provider_max_request_bytes: number | null;
    integrator_max_file_bytes: number | null;
  };
  price_per_image_usd: Record<string, number>;
  billing_unit: "image";
  average_request_cost_usd?: number | null;
};

export type IntegratorImageCatalog = {
  providers: Array<{ id: string; label: string }>;
  styles: Array<{ id: string; label: string; description: string; swatch: string }>;
  models: IntegratorImageModel[];
};

const IMAGE_CATALOG_FRESH_MS = 30_000;
const IMAGE_CATALOG_TIMEOUT_MS = 10_000;

async function loadImageCatalog(): Promise<IntegratorImageCatalog> {
  try {
    return await request<IntegratorImageCatalog>("/v1/image-models", { timeoutMs: IMAGE_CATALOG_TIMEOUT_MS });
  } catch (error) {
    const status = error && typeof error === "object" && "statusCode" in error
      ? Number((error as { statusCode: number }).statusCode)
      : 0;
    if (status >= 400 && status < 500) throw error;
    return request<IntegratorImageCatalog>("/v1/image-models", { timeoutMs: IMAGE_CATALOG_TIMEOUT_MS });
  }
}

const imageCatalogCache = createResilientCache(loadImageCatalog, IMAGE_CATALOG_FRESH_MS);

export type IntegratorImageResult = {
  id: string;
  request_id: string;
  provider: string;
  model: string;
  data: Array<{ url: string; mime: string; width?: number; height?: number }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number; images: number; cost_usd: number; average_request_cost_usd?: number | null };
  meta: { model_label: string; size: string; format: string; style: string; reasoning: string | null; latency_ms: number };
};

export async function integratorTranscribe(input: { audioBase64: string; mime: string; filename: string }): Promise<string> {
  const response = await request<{ text: string }>("/v1/audio/transcriptions", {
    method: "POST",
    body: JSON.stringify({ audio_base64: input.audioBase64, mime: input.mime, filename: input.filename }),
  });
  return response.text.trim();
}

export type IntegratorAverageCostItem = {
  kind: string;
  provider: string;
  model: string;
  averageCostUsd: number | null;
  requestCount?: number;
};

export async function integratorAverageCosts(kind: string): Promise<IntegratorAverageCostItem[]> {
  const data = await request<{ items?: IntegratorAverageCostItem[] }>(`/v1/average-costs?kind=${encodeURIComponent(kind)}`);
  return data.items ?? [];
}

export async function integratorModels(): Promise<IntegratorModel[]> {
  const response = await request<{ models: IntegratorModel[] }>("/v1/models");
  // DeepSeek / Meta / MiniMax идут через OpenRouter: Integrator ставит configured=false
  // без собственного ключа, но модели в каталоге рабочие и должны попасть в dest.
  return response.models;
}

export async function integratorImageCatalog(): Promise<IntegratorImageCatalog> {
  return imageCatalogCache.get();
}

export type IntegratorMediaModel = {
  provider: string;
  provider_label: string;
  id: string;
  label: string;
  description?: string;
};

export type IntegratorMusicModel = IntegratorMediaModel & {
  description: string;
  modes: Array<"song" | "instrumental">;
  durations: number[];
  default_duration: number;
  lyrics: boolean;
  vocal_gender: boolean;
  vocal_options: Array<"auto" | "female" | "male" | "duet">;
  image_input: boolean;
  vocal_clone: boolean;
  prompt_only_song: boolean;
  duration_control: boolean;
  capabilities: Array<{ id: string; label: string }>;
  languages: string[];
  billing_unit: "track" | "audio_second" | "audio_minute";
  price_per_track_usd: number | null;
  price_per_second_usd?: number | null;
  price_per_second_cny: number | null;
  price_per_minute_usd: number | null;
  average_request_cost_usd?: number | null;
  available?: boolean;
  region_note?: string | null;
};

export type IntegratorMusicCatalog = {
  providers: Array<{ id: string; label: string; logo?: string }>;
  genres: Array<{ id: string; label: string }>;
  styles: Array<{ id: string; label: string }>;
  moods: Array<{ id: string; label: string }>;
  purposes: Array<{ id: string; label: string }>;
  languages: Array<{ id: string; label: string }>;
  models: IntegratorMusicModel[];
};

export type IntegratorMusicResult = {
  id: string;
  request_id: string;
  provider: string;
  model: string;
  data: Array<{ url: string; mime: string; duration_sec?: number | null }>;
  lyrics?: string | null;
  usage: { duration_sec: number; cost_usd: number; average_request_cost_usd?: number | null };
  meta: { model_label: string; mode: string; duration_sec: number; title: string | null; latency_ms: number };
};

export type IntegratorVideoModel = IntegratorMediaModel & {
  description: string;
  modes: string[];
  generation_modes?: string[];
  durations: number[];
  default_duration: number;
  resolutions: string[];
  default_resolution: string | null;
  aspect_ratios?: string[];
  default_aspect_ratio?: string | null;
  first_frame?: boolean;
  last_frame?: boolean;
  max_reference_images?: number;
  video_to_video?: { max_clips?: number; max_file_bytes?: number; min_duration_sec?: number; max_duration_sec?: number } | null;
  person_in_video?: boolean;
  verified_asset?: "required" | "conditional" | "not_required" | "route_dependent" | "not_documented";
  person_policy?: {
    verified_asset?: "required" | "conditional" | "not_required" | "route_dependent" | "not_documented";
  } | null;
  motion_control?: boolean;
  max_prompt_chars?: number | null;
  prompt_limit_source?: "provider" | "provider_recommended" | "integrator" | null;
  prompt_limit_source_url?: string | null;
  provider_prompt_limit?: {
    enforcement?: "advisory" | null;
    kind?: "hard" | "recommended" | null;
    max_chars?: number | null;
    max_tokens?: number | null;
    source_url?: string | null;
  } | null;
  sound?: string[];
  sound_modes?: string[];
  offered?: boolean;
  billing_unit?: string;
  price_per_second_usd: Record<string, number> | null;
  price_per_second_with_audio_usd: Record<string, number> | null;
  average_request_cost_usd?: number | null;
};

export type IntegratorVideoResult = {
  id: string;
  request_id: string;
  provider: string;
  model: string;
  data: Array<{ url: string; mime: string; duration_sec?: number | null }>;
  usage: { duration_sec: number; cost_usd: number; average_request_cost_usd?: number | null };
  meta: {
    model_label: string;
    mode: string;
    duration_sec: number;
    resolution: string;
    aspect_ratio: string;
    audio?: boolean;
    latency_ms: number;
  };
};

export type IntegratorVideoCatalog = {
  providers: Array<{ id: string; label: string; logo?: string }>;
  models: IntegratorVideoModel[];
};

export async function integratorVideoCatalog(): Promise<IntegratorVideoModel[]> {
  const catalog = await integratorVideoCatalogFull();
  return catalog.models;
}

export async function integratorVideoCatalogFull(): Promise<IntegratorVideoCatalog> {
  const response = await request<IntegratorVideoCatalog>("/v1/video-models");
  return {
    providers: response.providers ?? [],
    models: (response.models ?? []).filter((model) => model.offered !== false),
  };
}

export async function integratorGenerateVideo(input: {
  provider: string;
  model: string;
  mode: "text-to-video" | "image-to-video" | "ref-to-video" | "video-to-video" | "motion-control";
  prompt: string;
  duration: number;
  resolution: string;
  aspectRatio: string;
  sound: "on" | "off";
  firstFrame?: string;
  lastFrame?: string;
  references?: string[];
  videos?: string[];
  jobId?: string;
  requestId?: string;
}): Promise<IntegratorVideoResult> {
  const requestId = input.requestId ?? randomUUID();
  return requestHeld<IntegratorVideoResult>("/v1/videos/generations", {
    method: "POST",
    timeoutMs: 30 * 60_000,
    body: JSON.stringify({
      provider: input.provider,
      model: input.model,
      mode: input.mode,
      prompt: input.prompt,
      duration: input.duration,
      resolution: input.resolution,
      aspect_ratio: input.aspectRatio,
      sound: input.sound,
      audio: input.sound === "on",
      first_frame: input.firstFrame,
      last_frame: input.lastFrame,
      references: input.references,
      videos: input.videos,
      request_id: requestId,
      source: input.jobId ? `Genora.art · Видео · ${input.jobId}` : "Genora.art · Видео",
    }),
  }, requestId);
}

export async function integratorUsageBySource(source: string): Promise<IntegratorUsageItem[]> {
  const response = await request<{ items?: unknown[] }>(
    `/v1/usage?modality=video&source=${encodeURIComponent(source)}&limit=20`,
  );
  return (response.items ?? []).flatMap((item) => {
    const row = normalizeIntegratorUsageItem(item);
    return row ? [row] : [];
  });
}

export async function integratorUsageByRequestId(requestId: string): Promise<IntegratorUsageItem | null> {
  const response = await request<{ items?: unknown[] }>(
    `/v1/usage?request_id=${encodeURIComponent(requestId)}&limit=5`,
  );
  return (response.items ?? []).flatMap((item) => {
    const row = normalizeIntegratorUsageItem(item);
    return row ? [row] : [];
  }).find((item) => item.requestId === requestId) ?? null;
}

export async function integratorVideoAssetsByRequest(requestId: string): Promise<Array<{ id: string; mime: string; durationSec?: number | null }>> {
  const response = await request<{ items?: Array<{ id: string; mime: string; durationSec?: number | null }> }>(
    `/v1/video-assets?request_id=${encodeURIComponent(requestId)}`,
  );
  return response.items ?? [];
}

export async function integratorVideoAsset(assetId: string): Promise<{ bytes: ArrayBuffer; mime: string }> {
  const { baseUrl, apiKey } = configuration();
  const response = await fetch(`${baseUrl}/v1/videos/${encodeURIComponent(assetId)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
    headers: { authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    const error = new Error(`IntegratorAI HTTP ${response.status}`) as Error & { statusCode: number };
    error.statusCode = response.status === 404 ? 404 : 502;
    throw error;
  }
  return { bytes: await response.arrayBuffer(), mime: response.headers.get("content-type")?.split(";")[0] || "video/mp4" };
}

export async function integratorMusicCatalog(): Promise<IntegratorMusicModel[]> {
  const catalog = await integratorMusicCatalogFull();
  return catalog.models;
}

export async function integratorMusicCatalogFull(): Promise<IntegratorMusicCatalog> {
  return request<IntegratorMusicCatalog>("/v1/music-models");
}

export async function integratorGenerateMusic(input: {
  provider: string;
  model: string;
  mode: "song" | "instrumental";
  prompt: string;
  lyrics?: string;
  title?: string;
  genre?: string;
  style?: string;
  mood?: string;
  purpose?: string;
  bpm?: number;
  duration?: number;
  vocal?: "auto" | "female" | "male" | "duet";
  language?: string;
  inputVideo?: string;
  requestId?: string;
}): Promise<IntegratorMusicResult> {
  const requestId = input.requestId ?? randomUUID();
  return requestHeld<IntegratorMusicResult>("/v1/music/generations", {
    method: "POST",
    timeoutMs: 12 * 60_000,
    body: JSON.stringify({
      provider: input.provider,
      model: input.model,
      mode: input.mode,
      prompt: input.prompt,
      lyrics: input.lyrics,
      title: input.title,
      genre: input.genre,
      style: input.style,
      mood: input.mood,
      purpose: input.purpose,
      bpm: input.bpm,
      duration: input.duration,
      vocal: input.vocal,
      language: input.language,
      input_video: input.inputVideo,
      request_id: requestId,
      source: "Genora.art · песня",
    }),
  }, requestId);
}

export async function integratorMusicLyrics(input: {
  prompt: string;
  mode?: "song" | "instrumental";
  duration?: number;
  bpm: number;
  language?: string;
  maxChars: number;
  genre?: string;
  style?: string;
  mood?: string;
  purpose?: string;
}): Promise<{ lyrics: string; duration_sec: number }> {
  return request<{ lyrics: string; duration_sec: number }>("/v1/music/lyrics", {
    method: "POST",
    timeoutMs: 90_000,
    body: JSON.stringify({
      prompt: input.prompt,
      mode: input.mode,
      duration: input.duration,
      bpm: input.bpm,
      language: input.language,
      max_chars: input.maxChars,
      genre: input.genre,
      style: input.style,
      mood: input.mood,
      purpose: input.purpose,
    }),
  });
}

export async function integratorMusicAsset(assetId: string): Promise<{ bytes: ArrayBuffer; mime: string }> {
  const { baseUrl, apiKey } = configuration();
  const response = await fetch(`${baseUrl}/v1/music/${encodeURIComponent(assetId)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
    headers: { authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    const error = new Error(`IntegratorAI HTTP ${response.status}`) as Error & { statusCode: number };
    error.statusCode = response.status === 404 ? 404 : 502;
    throw error;
  }
  return { bytes: await response.arrayBuffer(), mime: response.headers.get("content-type")?.split(";")[0] || "audio/mpeg" };
}

export async function integratorGenerateImage(input: {
  provider: string;
  model: string;
  prompt: string;
  size: string;
  format: string;
  style: string;
  reasoning?: string;
  inputImage?: string;
  inputImages?: string[];
  count?: 1 | 2 | 4;
  requestId?: string;
}): Promise<IntegratorImageResult> {
  const inputImages = (input.inputImages ?? []).filter(Boolean).slice(0, 4);
  const inputImage = inputImages[0] ?? input.inputImage;
  const requestId = input.requestId ?? randomUUID();
  return requestHeld<IntegratorImageResult>("/v1/images/generations", {
    method: "POST",
    body: JSON.stringify({
      provider: input.provider,
      model: input.model,
      prompt: input.prompt,
      size: input.size,
      format: input.format,
      style: input.style,
      ...(input.reasoning ? { reasoning: input.reasoning } : {}),
      ...(inputImage ? { input_image: inputImage } : {}),
      ...(inputImages.length ? { input_images: inputImages } : {}),
      n: input.count ?? 1,
      request_id: requestId,
      source: "Genora.art · Изображения ИИ",
    }),
  }, requestId);
}

export async function integratorImageAsset(assetId: string): Promise<{ bytes: ArrayBuffer; mime: string }> {
  const { baseUrl, apiKey } = configuration();
  const response = await fetch(`${baseUrl}/v1/images/${encodeURIComponent(assetId)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
    headers: { authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    const error = new Error(`IntegratorAI HTTP ${response.status}`) as Error & { statusCode: number };
    error.statusCode = response.status === 404 ? 404 : 502;
    throw error;
  }
  return { bytes: await response.arrayBuffer(), mime: response.headers.get("content-type")?.split(";")[0] || "image/png" };
}

export async function integratorChat(input: {
  provider: string;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: IntegratorMessageContent }>;
  reasoning?: string;
  chatId: string;
  memoryDepth: "shallow" | "standard" | "deep";
  source: string;
  webSearch?: boolean;
  timezone?: string;
  maxOutputTokens?: number;
  timeoutMs?: number;
  requestId?: string;
  agentId?: string;
  videoFps?: number;
}): Promise<IntegratorChatResult> {
  const requestId = input.requestId ?? randomUUID();
  return requestHeld<IntegratorChatResult>("/v1/chat/completions", {
    method: "POST",
    timeoutMs: integratorRequestTimeoutMs(input),
    body: JSON.stringify({
      provider: input.provider,
      model: input.model,
      messages: input.messages,
      ...(input.reasoning ? { reasoning: input.reasoning } : {}),
      chat_id: input.chatId,
      memory_depth: input.memoryDepth,
      source: input.source,
      timezone: input.timezone,
      request_id: requestId,
      ...(input.agentId ? { agent_id: input.agentId } : {}),
      ...(input.videoFps ? { video_fps: input.videoFps } : {}),
      ...(input.maxOutputTokens ? { max_output_tokens: input.maxOutputTokens } : {}),
      ...(input.webSearch === undefined ? {} : { web_search: input.webSearch }),
    }),
  }, requestId);
}
