import { billedTokensFromUsd } from "@/lib/billing";

export const DEFAULT_VIDEO_MULTIPLIER = 2.5;

export type VideoSound = "on" | "off";
export type VideoMode = "text-to-video" | "image-to-video" | "ref-to-video" | "video-to-video" | "motion-control";
export const V2V_FILE_ACCEPT = "video/mp4,video/quicktime,video/webm,image/png,image/jpeg,image/webp";

export type VideoPriceSource = {
  resolutions?: string[];
  default_resolution?: string | null;
  sound_modes?: string[] | null;
  sound?: string[] | null;
  price_per_second_usd?: Record<string, number> | null;
  price_per_second_with_audio_usd?: Record<string, number> | null;
};

export type VideoTariffUsd = {
  key: string;
  resolution: string;
  sound: VideoSound[];
  usd: number;
};

export type VideoTariffToken = VideoTariffUsd & { tokens: number };

export function videoDbId(provider: string, modelId: string) {
  return `video:${provider}:${modelId}`;
}

function samePrice(left: number | null | undefined, right: number | null | undefined) {
  return left != null && right != null && left === right;
}

function asSound(modes: string[] | null | undefined): VideoSound[] {
  return (modes ?? []).filter((item): item is VideoSound => item === "on" || item === "off");
}

export function videoSoundModes(model: VideoPriceSource): VideoSound[] {
  return asSound(model.sound_modes ?? model.sound);
}

export function videoTariffUsd(model: VideoPriceSource): VideoTariffUsd[] {
  const silent = model.price_per_second_usd ?? {};
  const voiced = model.price_per_second_with_audio_usd ?? {};
  const resolutions = model.resolutions?.length ? model.resolutions : [...new Set([...Object.keys(silent), ...Object.keys(voiced)])];
  const modes = videoSoundModes(model);
  const canOff = modes.includes("off") || (!modes.length && Object.keys(silent).length > 0);
  const canOn = modes.includes("on") || Object.keys(voiced).length > 0;
  const rows: VideoTariffUsd[] = [];
  for (const resolution of resolutions) {
    const quiet = Number(silent[resolution]);
    const loud = Number(voiced[resolution]);
    const silentOk = Number.isFinite(quiet);
    const voicedOk = Number.isFinite(loud);
    if (canOff && canOn && silentOk && voicedOk && !samePrice(quiet, loud)) {
      rows.push({ key: resolution, resolution, sound: ["off"], usd: quiet });
      rows.push({ key: `${resolution}:audio`, resolution, sound: ["on"], usd: loud });
      continue;
    }
    const usd = canOn && !canOff ? (voicedOk ? loud : quiet) : silentOk ? quiet : loud;
    if (!Number.isFinite(usd)) continue;
    const sound: VideoSound[] = [];
    if (canOff) sound.push("off");
    if (canOn) sound.push("on");
    rows.push({ key: resolution, resolution, sound: sound.length ? sound : canOn ? ["on"] : ["off"], usd });
  }
  return rows;
}

export function videoModelTokenPrices(model: VideoPriceSource, multiplier: number) {
  const tariffs = videoTariffUsd(model).map((row) => ({
    ...row,
    tokens: billedTokensFromUsd(row.usd, multiplier),
  }));
  return {
    tariffs,
    token_prices: Object.fromEntries(tariffs.map((row) => [row.key, row.tokens])),
  };
}

export function videoCapabilityTags(modes: string[] | null | undefined, sound: string[] | null | undefined) {
  const tags: string[] = [];
  if (modes?.includes("text-to-video")) tags.push("t2v");
  if (modes?.includes("image-to-video")) tags.push("i2v");
  if (modes?.includes("ref-to-video")) tags.push("ref");
  if (modes?.includes("video-to-video") || modes?.includes("motion-control")) tags.push("v2v");
  if (sound?.includes("on")) tags.push("sound");
  return tags;
}

export type StudioVideoMode = "t2v" | "animate" | "i2v" | "v2v";

export type VideoCatalogModel = VideoPriceSource & {
  provider: string;
  provider_label?: string;
  id: string;
  label: string;
  modes?: string[];
  durations?: number[];
  default_duration?: number;
  resolutions?: string[];
  default_resolution?: string | null;
  aspect_ratios?: string[];
  default_aspect_ratio?: string | null;
  first_frame?: boolean;
  last_frame?: boolean;
  max_reference_images?: number;
  video_to_video?: {
    max_clips?: number;
    max_file_bytes?: number;
    min_duration_sec?: number;
    max_duration_sec?: number;
  } | null;
  generation_mode_limits?: {
    "video-to-video"?: {
      max_references?: number;
      person_in_video?: boolean;
    };
  } | null;
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
  multiplier?: number;
  token_prices?: Record<string, number>;
  tariffs?: VideoTariffToken[];
};

export function videoCharacterRightsRequired(model?: VideoCatalogModel | null): boolean {
  return (model?.person_policy?.verified_asset ?? model?.verified_asset) === "required";
}

export function studioIntegratorMode(ui: StudioVideoMode, model: VideoCatalogModel): VideoMode | null {
  const modes = model.modes ?? [];
  if (ui === "t2v") return modes.includes("text-to-video") ? "text-to-video" : null;
  if (ui === "animate") return modes.includes("image-to-video") ? "image-to-video" : null;
  if (ui === "i2v") {
    if (modes.includes("ref-to-video")) return "ref-to-video";
    if (modes.includes("image-to-video")) return "image-to-video";
    return null;
  }
  if (modes.includes("motion-control")) return "motion-control";
  // Wan 3.0 documents V2V for Alibaba's native API, but our current
  // OpenRouter delivery route rejects every video input reference.
  if (model.provider === "alibaba" && model.id === "wan-3.0") return null;
  return modes.includes("video-to-video") ? "video-to-video" : null;
}

export function videoV2vAcceptsPhotos(model?: VideoCatalogModel) {
  if (!model) return true;
  // Keep this aligned with studioIntegratorMode: the current Wan 3.0
  // OpenRouter route rejects video input references altogether.
  if (model.provider === "alibaba" && model.id === "wan-3.0") return false;
  const modes = model.modes ?? [];
  const modeLimits = model.generation_mode_limits?.["video-to-video"];
  if (modeLimits?.max_references === 0 || modeLimits?.person_in_video === false) return false;
  return Boolean(modeLimits?.person_in_video || model.person_in_video || model.motion_control || modes.includes("motion-control"));
}

export function videoModelSupportsCharacter(model: VideoCatalogModel): boolean {
  return (model.modes ?? []).includes("ref-to-video")
    && (model.max_reference_images ?? 0) >= 1;
}

export function videoModeSlotMax(ui: StudioVideoMode): number {
  if (ui === "t2v") return 0;
  if (ui === "animate") return 1;
  if (ui === "i2v") return 4;
  return 3;
}

export function videoSlotCount(ui: StudioVideoMode, model: VideoCatalogModel | undefined): number {
  const max = videoModeSlotMax(ui);
  if (!model) return max;
  const mode = studioIntegratorMode(ui, model);
  if (ui === "t2v" || !mode) return 0;
  if (ui === "animate") return 1;
  if (mode === "ref-to-video") return Math.min(max, Math.max(1, model.max_reference_images ?? max));
  if (mode === "image-to-video") return Math.min(max, model.last_frame ? 2 : 1);
  if (mode === "motion-control") return Math.min(max, Math.max(2, model.video_to_video?.max_clips ?? 2));
  const clips = Math.max(1, model.video_to_video?.max_clips ?? max);
  const photos = model.person_in_video ? Math.max(1, model.max_reference_images ?? 0) : 0;
  return Math.min(max, Math.max(clips, photos ? clips + 1 : clips));
}

export function videoAcceptsMode(model: VideoCatalogModel, ui: StudioVideoMode) {
  return studioIntegratorMode(ui, model) != null;
}

export function videoDurationInRange(model: VideoCatalogModel, wanted: number) {
  const durations = model.durations ?? [];
  if (!durations.length) return wanted >= 4 && wanted <= 30;
  return wanted >= Math.min(...durations) && wanted <= Math.max(...durations);
}

export function nearestVideoDuration(allowed: number[], wanted: number) {
  if (!allowed.length) return Math.min(30, Math.max(4, wanted));
  return allowed.reduce((best, item) => Math.abs(item - wanted) < Math.abs(best - wanted) ? item : best, allowed[0]);
}

export function isMotionControlModel(model?: VideoCatalogModel | null) {
  return Boolean(model?.motion_control || model?.modes?.includes("motion-control"));
}

export function motionControlClipBounds(model?: VideoCatalogModel | null) {
  const allowed = model?.durations?.length ? model.durations : [5, 6, 7, 8, 9, 10];
  const limit = model?.video_to_video;
  const min = Math.max(1, limit?.min_duration_sec ?? Math.min(...allowed));
  const max = Math.max(min, limit?.max_duration_sec ?? Math.max(...allowed));
  return {
    allowed,
    min,
    max,
    maxFileBytes: Math.min(limit?.max_file_bytes ?? VIDEO_REQUEST_FILE_MAX_BYTES, VIDEO_REQUEST_FILE_MAX_BYTES),
  };
}

/** Длина для цены: не короче ролика, ближайший разрешённый шаг модели. */
export function motionControlDurationFromClip(model: VideoCatalogModel | null | undefined, clipSeconds: number) {
  if (!Number.isFinite(clipSeconds) || clipSeconds <= 0) return null;
  const { allowed, min, max } = motionControlClipBounds(model);
  if (clipSeconds + 0.05 < min || clipSeconds > max + 0.49) return null;
  const need = Math.min(max, Math.max(min, Math.ceil(clipSeconds - 0.05)));
  return allowed.find((item) => item >= need && item <= max) ?? null;
}

export function motionControlClipIssue(
  model: VideoCatalogModel | null | undefined,
  bytes: number,
  clipSeconds: number,
): "size" | "duration-short" | "duration-long" | "duration" | null {
  const { min, max, maxFileBytes } = motionControlClipBounds(model);
  if (!Number.isFinite(bytes) || bytes <= 0 || bytes > maxFileBytes) return "size";
  if (!Number.isFinite(clipSeconds) || clipSeconds <= 0) return "duration";
  if (clipSeconds + 0.05 < min) return "duration-short";
  if (clipSeconds > max + 0.49) return "duration-long";
  return motionControlDurationFromClip(model, clipSeconds) == null ? "duration" : null;
}

export function dataUrlDecodedBytes(value: string) {
  const comma = value.indexOf(",");
  const payload = comma >= 0 ? value.slice(comma + 1) : value;
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
}

export function motionControlRequestDuration(
  model: VideoCatalogModel | null | undefined,
  clipSeconds: number,
  videoBytes: number,
) {
  return motionControlClipIssue(model, videoBytes, clipSeconds)
    ? null
    : motionControlDurationFromClip(model, clipSeconds);
}

export function videoDurationBounds(models: VideoCatalogModel[]) {
  const values = [...new Set(models.flatMap((model) => model.durations ?? []))].sort((left, right) => left - right);
  return {
    min: values[0] ?? 4,
    max: values[values.length - 1] ?? 30,
    values,
  };
}

export function videoTokensForClip(model: VideoCatalogModel, resolution: string, sound: VideoSound, duration: number) {
  const tariffs = model.tariffs?.length ? model.tariffs : videoModelTokenPrices(model, model.multiplier ?? DEFAULT_VIDEO_MULTIPLIER).tariffs;
  const row = tariffs.find((item) => item.resolution === resolution && item.sound.includes(sound))
    ?? tariffs.find((item) => item.resolution === resolution);
  const perSecond = row?.tokens ?? model.token_prices?.[sound === "on" ? `${resolution}:audio` : resolution] ?? model.token_prices?.[resolution];
  if (typeof perSecond !== "number") return null;
  return perSecond * duration;
}

export const AVERAGE_VIDEO_SECONDS = 8;

export function averageCatalogVideoTokens(
  models: Array<VideoPriceSource & { multiplier?: number; tariffs?: VideoTariffToken[] }>,
  duration = AVERAGE_VIDEO_SECONDS,
) {
  const values = models.flatMap((model) => {
    const tariffs = model.tariffs?.length
      ? model.tariffs
      : videoModelTokenPrices(model, model.multiplier ?? DEFAULT_VIDEO_MULTIPLIER).tariffs;
    return tariffs.map((row) => row.tokens * duration).filter((value) => Number.isFinite(value) && value > 0);
  });
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Integrator принимает картинку-референс не больше 12 МБ. */
export const VIDEO_IMAGE_FILE_MAX_BYTES = 12_000_000;
/** Dest-прокси 40 МБ на весь JSON; сырые файлы с запасом на base64. */
export const VIDEO_REQUEST_FILE_MAX_BYTES = 18_000_000;

export function videoPerFileMaxBytes(ui: StudioVideoMode, model?: VideoCatalogModel, pool: VideoCatalogModel[] = []) {
  const models = model ? [model] : pool;
  if (ui === "v2v") {
    const caps = models
      .map((item) => item.video_to_video?.max_file_bytes)
      .filter((item): item is number => typeof item === "number" && item > 0);
    const modelCap = caps.length ? Math.min(...caps) : 50 * 1024 * 1024;
    return Math.min(modelCap, VIDEO_REQUEST_FILE_MAX_BYTES);
  }
  return VIDEO_IMAGE_FILE_MAX_BYTES;
}

export function videoTotalMaxBytes() {
  return VIDEO_REQUEST_FILE_MAX_BYTES;
}

export function videoLimitMb(bytes: number) {
  return Math.max(1, Math.round(bytes / 1_000_000));
}

export const DEFAULT_VIDEO_PROMPT_MAX = 8_000;

type VideoPromptLimits = { hard: number; recommended: number };

const VIDEO_PROMPT_LIMITS: Record<string, VideoPromptLimits> = {
  "hailuo-3": { hard: 10_000, recommended: 7_000 },
  "hailuo-2.3": { hard: 8_000, recommended: 2_000 },
  "seedance-2.5": { hard: 8_000, recommended: 5_000 },
  "seedance-2.0": { hard: 8_000, recommended: 5_000 },
  "seedance-2.0-fast": { hard: 8_000, recommended: 5_000 },
  "seedance-2.0-mini": { hard: 8_000, recommended: 5_000 },
  "seedance-1-5-pro": { hard: 8_000, recommended: 4_000 },
  "flux-3-video": { hard: 20_000, recommended: 8_000 },
  "gen-4.5": { hard: 8_000, recommended: 2_500 },
  "omni-1.1-flash": { hard: 20_000, recommended: 8_000 },
};

export function videoPromptLimits(model?: Pick<VideoCatalogModel, "id" | "provider" | "max_prompt_chars" | "provider_prompt_limit"> | null): VideoPromptLimits {
  const exact = model ? VIDEO_PROMPT_LIMITS[model.id] : undefined;
  if (exact) return exact;
  if (model && (model.provider === "kling" || model.id?.startsWith("kling-"))) {
    return { hard: 8_000, recommended: 2_500 };
  }
  const hard = videoPromptMaxChars(model);
  const providerChars = Number(model?.provider_prompt_limit?.max_chars);
  const providerTokens = Number(model?.provider_prompt_limit?.max_tokens);
  const providerRecommended = Number.isInteger(providerChars) && providerChars > 0
    ? providerChars
    : Number.isInteger(providerTokens) && providerTokens > 0
      ? providerTokens * 4
      : hard;
  return { hard, recommended: Math.min(hard, providerRecommended) };
}

export function videoPromptMaxChars(model?: Pick<VideoCatalogModel, "max_prompt_chars"> | null) {
  const limit = Number(model?.max_prompt_chars);
  return Number.isInteger(limit) && limit > 0 ? limit : DEFAULT_VIDEO_PROMPT_MAX;
}

export function videoPromptAdvisoryChars(model?: Pick<VideoCatalogModel, "id" | "provider" | "max_prompt_chars" | "provider_prompt_limit"> | null) {
  return videoPromptLimits(model).recommended;
}

export function videoUserPromptMaxChars(model: Pick<VideoCatalogModel, "id" | "provider" | "max_prompt_chars" | "provider_prompt_limit"> | null | undefined, extraChars = 0) {
  const max = videoPromptAdvisoryChars(model);
  return Math.max(1, max - Math.max(0, extraChars));
}

export function videoUserPromptHardChars(model: Pick<VideoCatalogModel, "id" | "provider" | "max_prompt_chars" | "provider_prompt_limit"> | null | undefined, extraChars = 0) {
  return Math.max(1, videoPromptLimits(model).hard - Math.max(0, extraChars));
}

export function splitVideoPrompt(prompt: string, maxChars: number) {
  const limit = Math.max(1, Math.floor(maxChars));
  return {
    accepted: prompt.slice(0, limit),
    overflow: prompt.slice(limit),
  };
}

export function filterVideoModels(
  models: VideoCatalogModel[],
  filters: { mode: StudioVideoMode; duration?: number; resolution?: string; aspect?: string; sound?: VideoSound; provider?: string },
) {
  return models.filter((model) => {
    if (!videoAcceptsMode(model, filters.mode)) return false;
    if (filters.provider && model.provider !== filters.provider) return false;
    if (filters.duration && !videoDurationInRange(model, filters.duration)) return false;
    if (filters.resolution && !(model.resolutions ?? []).includes(filters.resolution)) return false;
    if (filters.aspect && !(model.aspect_ratios ?? []).includes(filters.aspect)) return false;
    if (filters.sound && !videoSoundModes(model).includes(filters.sound) && videoSoundModes(model).length) return false;
    return true;
  });
}

/** Списки размера / формата / провайдера: только уже выбранные фильтры, без звука. */
export function videoOpenChoices(
  models: VideoCatalogModel[],
  filters: { mode: StudioVideoMode; duration?: number; resolution?: string; aspect?: string; provider?: string },
) {
  const pool = filterVideoModels(models, filters);
  return {
    resolutions: [...new Set(pool.flatMap((item) => item.resolutions ?? []))],
    aspects: [...new Set(pool.flatMap((item) => item.aspect_ratios ?? []))],
    providers: [...new Set(pool.map((item) => item.provider))],
  };
}
