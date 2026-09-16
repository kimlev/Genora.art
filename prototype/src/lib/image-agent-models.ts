import { LOCATION_AGENT_IDS } from "@/lib/image-agent-gallery";

const LOCATION_IDS = new Set<string>(LOCATION_AGENT_IDS);

export type ImageRefModel = {
  input_image?: { supported?: boolean };
  max_reference_images?: number;
};

/** Сколько референсов обязательно для агента. 0 — без отдельного ограничения. */
export function imageAgentMinReferences(id: string): number {
  if (id === "character-card") return 3;
  return LOCATION_IDS.has(id) ? 2 : 0;
}

export function modelSupportsMinReferences(model: ImageRefModel, min: number): boolean {
  if (min < 2) return true;
  const cap = model.max_reference_images;
  return Boolean(model.input_image?.supported) && typeof cap === "number" && Number.isFinite(cap) && cap >= min;
}

export function filterModelsForMinReferences<T extends ImageRefModel>(models: T[], min: number): T[] {
  if (min < 2) return models;
  return models.filter((model) => modelSupportsMinReferences(model, min));
}
