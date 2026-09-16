import { commercialModels } from "@/lib/catalog/commercial-models";
import { sortModelsByStrength } from "@/lib/catalog/model-rank";
import { isImageCatalogModel, isMusicCatalogModel, isVideoCatalogModel } from "@/lib/catalog/model-kind";
import { getCommercialModelMetrics } from "@/lib/model-metrics";
import { CREATE_FOTO_VIDEO_PATH, imageStudioHref } from "@/lib/routes";

export type PublicModelKind = "text" | "image" | "audio" | "video" | "music";

export type PublicModel = {
  id: string;
  name: string;
  provider: string;
  kind: PublicModelKind;
  score: number;
  href: string;
  tags?: string[];
};

export const AUDIO_MODELS: PublicModel[] = [
  { id: "suno-v4", name: "Suno v4", provider: "Suno", kind: "audio", score: 1_820, href: "/chat" },
  { id: "udio", name: "Udio", provider: "Udio", kind: "audio", score: 1_740, href: "/chat" },
  { id: "elevenlabs-music", name: "ElevenLabs Music", provider: "ElevenLabs", kind: "audio", score: 1_690, href: "/chat" },
  { id: "stable-audio", name: "Stable Audio", provider: "Stability", kind: "audio", score: 1_520, href: "/chat" },
];

export function textModelsFromCatalog(
  models: Array<{ id: string; name: string; provider: string; score?: number; capabilities?: { kind?: string } | null }>,
): PublicModel[] {
  const source = models.length ? models : commercialModels.map((model) => ({ ...model, ...getCommercialModelMetrics(model) }));
  return sortModelsByStrength(source.filter((model) => !isImageCatalogModel(model) && !isMusicCatalogModel(model) && !isVideoCatalogModel(model))).map((model) => ({
    id: model.id,
    name: model.name,
    provider: model.provider,
    kind: "text" as const,
    score: model.score ?? getCommercialModelMetrics(model).score,
    href: "/chat",
  }));
}

export function mediaModelsFromCatalog(
  models: Array<{ id: string; label: string; provider: string; provider_label: string; tags?: string[] }>,
  kind: "video" | "music",
): PublicModel[] {
  return models.map((model) => ({
    id: model.id,
    name: model.label,
    provider: model.provider_label || model.provider,
    kind,
    score: 0,
    href: kind === "music" ? "/music" : imageStudioHref("tab=video"),
    tags: model.tags,
  }));
}

export function imageModelsFromCatalog(
  models: Array<{ id: string; label: string; provider: string; provider_label: string }>,
): PublicModel[] {
  return models.map((model) => ({
    id: model.id,
    name: model.label,
    provider: model.provider_label || model.provider,
    kind: "image" as const,
    score: getCommercialModelMetrics({ id: model.id, name: model.label }).score,
    href: CREATE_FOTO_VIDEO_PATH,
  }));
}

export function popularModels(models: PublicModel[], limit = 6): PublicModel[] {
  return [...models].sort((left, right) => right.score - left.score || left.name.localeCompare(right.name)).slice(0, limit);
}

export function matchesQuery(model: PublicModel, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return `${model.name} ${model.provider} ${model.id}`.toLowerCase().includes(needle);
}
