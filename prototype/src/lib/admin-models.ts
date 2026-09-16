export type AdminModelKind = "text" | "image" | "audio" | "video";

export const MODEL_KIND_LABEL: Record<AdminModelKind, string> = {
  text: "Чаты",
  image: "Фото",
  audio: "Песни",
  video: "Видео",
};

export type AdminModelRow = {
  providerId: string;
  provider: string;
  modelId: string;
  model: string;
  kind: AdminModelKind;
  kindLabel: string;
  averageRequestCostUsd: number | null;
  revenueUsd: number;
  costUsd: number;
};

export type AdminModelUsage = {
  model: string;
  modelId: string | null;
  revenueUsd: number;
  costUsd: number;
};

export type AdminModelSource = {
  id: string;
  name: string;
  providerId: string;
  provider: string;
  source: AdminModelKind;
  averageRequestCostUsd: number | null;
};

const PROVIDER_NAMES: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google Gemini",
  kimi: "Kimi",
  xai: "xAI",
  alibaba: "Alibaba",
  deepseek: "DeepSeek",
  meta: "Meta",
  minimax: "MiniMax",
  flux: "Black Forest Labs",
  ideogram: "Ideogram",
  suno: "Suno",
  udio: "Udio",
  elevenlabs: "ElevenLabs",
  mureka: "Mureka",
  sonilo: "Sonilo",
  stability: "Stability",
  kling: "Kling",
  runway: "Runway",
  bytedance: "ByteDance",
};

export function providerLabel(id: string, fallback?: string | null): string {
  return fallback?.trim() || PROVIDER_NAMES[id] || id;
}

export function classifyModelKind(id: string, source: AdminModelKind): AdminModelKind {
  if (source === "video") return "video";
  if (source === "image") return "image";
  if (source === "audio") return "audio";
  if (id.startsWith("music:") || /(?:suno|udio|lyria|mureka|music_v2|stable-audio|(?:^|-)(?:music|song|audio)(?:-|$))/i.test(id)) return "audio";
  if (id.startsWith("video:") || /(?:veo|wan-|hailuo|seedance|kling|gen-4|flux-3-video|omni-1|(?:^|[-.])video(?:[-.]|$))/i.test(id)) return "video";
  return "text";
}

export function imageAverageRequestCost(model: {
  average_request_cost_usd?: number | null;
  price_per_image_usd?: Record<string, number>;
}): number | null {
  const direct = Number(model.average_request_cost_usd);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const prices = Object.values(model.price_per_image_usd ?? {}).map(Number).filter((value) => Number.isFinite(value) && value > 0);
  if (!prices.length) return null;
  return prices.reduce((sum, value) => sum + value, 0) / prices.length;
}

export function usageForModel(usage: AdminModelUsage[], modelId: string, displayName: string): { revenueUsd: number; costUsd: number } {
  return usage.reduce((sum, row) => {
    const hit = row.modelId === modelId || row.model === modelId || row.model === displayName;
    if (!hit) return sum;
    return { revenueUsd: sum.revenueUsd + row.revenueUsd, costUsd: sum.costUsd + row.costUsd };
  }, { revenueUsd: 0, costUsd: 0 });
}

export function buildAdminModelRows(sources: AdminModelSource[], usage: AdminModelUsage[]): AdminModelRow[] {
  const rows = sources.map((source) => {
    const kind = classifyModelKind(source.id, source.source);
    const totals = usageForModel(usage, source.id, source.name);
    return {
      providerId: source.providerId,
      provider: source.provider,
      modelId: source.id,
      model: source.name,
      kind,
      kindLabel: MODEL_KIND_LABEL[kind],
      averageRequestCostUsd: source.averageRequestCostUsd,
      revenueUsd: totals.revenueUsd,
      costUsd: totals.costUsd,
    };
  });
  const known = new Set(rows.flatMap((row) => [row.modelId, row.model]));
  for (const row of usage) {
    const key = row.modelId || row.model;
    if (!key || known.has(key) || known.has(row.model)) continue;
    known.add(key);
    known.add(row.model);
    const kind = classifyModelKind(key, "text");
    rows.push({
      providerId: "",
      provider: "—",
      modelId: key,
      model: row.model || key,
      kind,
      kindLabel: MODEL_KIND_LABEL[kind],
      averageRequestCostUsd: null,
      revenueUsd: row.revenueUsd,
      costUsd: row.costUsd,
    });
  }
  return rows.sort((left, right) => left.provider.localeCompare(right.provider, "ru") || left.model.localeCompare(right.model, "ru"));
}

export function filterAdminModels(rows: AdminModelRow[], providerId: string, modelId: string, kind = ""): AdminModelRow[] {
  return rows.filter((row) => (
    (!providerId || row.providerId === providerId)
    && (!modelId || row.modelId === modelId)
    && (!kind || row.kind === kind)
  ));
}

export function summarizeAdminModels(rows: AdminModelRow[]): {
  models: number;
  averagePrice: number;
  revenueUsd: number;
  costUsd: number;
} {
  const priced = rows.filter((row) => row.averageRequestCostUsd != null);
  return {
    models: rows.length,
    averagePrice: priced.length
      ? priced.reduce((sum, row) => sum + (row.averageRequestCostUsd ?? 0), 0) / priced.length
      : 0,
    revenueUsd: rows.reduce((sum, row) => sum + row.revenueUsd, 0),
    costUsd: rows.reduce((sum, row) => sum + row.costUsd, 0),
  };
}
