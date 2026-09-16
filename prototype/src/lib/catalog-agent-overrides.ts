import type { Agent, AgentCategory } from "@/lib/mock/agent-types";
import type { StudioVideoMode } from "@/lib/catalog/video-studio";
import type { VideoAgentReferenceInput, VideoAgentSettings } from "@/lib/video-agent-catalog";

export type CatalogAgentOverride = {
  id: string;
  name: string;
  description: string;
  category: AgentCategory;
  tag: string;
  icon: string;
  coverUrl: string | null;
  providerId: string;
  modelId: string;
  videoMode: StudioVideoMode | null;
  videoUrl: string | null;
  videoPreviewUrl: string | null;
  promptPlaceholder: string;
  referenceInputs: VideoAgentReferenceInput[];
  videoSettings: Partial<VideoAgentSettings>;
  created: boolean;
};

let overrides = new Map<string, CatalogAgentOverride>();
const listeners = new Set<() => void>();

export function setCatalogAgentOverrides(items: CatalogAgentOverride[]) {
  overrides = new Map(items.map((item) => [item.id, item]));
  listeners.forEach((fn) => fn());
}

export function getCatalogAgentOverride(id: string) {
  return overrides.get(id) ?? null;
}

export function listCatalogAgentOverrides(): CatalogAgentOverride[] {
  return [...overrides.values()];
}

export function listCreatedCatalogAgents(): Agent[] {
  return [...overrides.values()]
    .filter((item) => item.created)
    .map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      description: item.description,
      modelId: item.modelId || "",
      systemPrompt: "",
      icon: item.icon || "sparkles",
    }));
}

export function subscribeCatalogAgentOverrides(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export const CATALOG_AGENTS_CHANGED = "genora-agents-change";
