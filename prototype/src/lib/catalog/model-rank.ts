import { canonicalModelUseId } from "@/lib/i18n/copy/model-use";

/** Newest and strongest first. Unknown ids fall back to version + tier. */
const STRENGTH_ORDER = [
  "gpt-6-astra",
  "gpt-5.6-sol",
  "claude-fable-5",
  "claude-opus-5",
  "gpt-5.6-terra",
  "claude-sonnet-5",
  "gemini-3.1-pro-preview",
  "qwen3.8-max",
  "qwen3.7-max",
  "grok-4.20-multi-agent",
  "grok-4.20-reasoning",
  "grok-4.5",
  "kimi-k3",
  "gpt-5.6-luna",
  "gpt-5.5-pro",
  "gpt-5.5",
  "gpt-5.4-pro",
  "claude-opus-4-8",
  "claude-opus-4-7",
  "claude-opus-4-6",
  "claude-opus-4-5",
  "gpt-5.2-pro",
  "gpt-5.4",
  "gpt-5-pro",
  "o3",
  "grok-4.20",
  "grok-4.3",
  "grok-build-0.1",
  "qwen3.7-plus",
  "claude-sonnet-4-6",
  "claude-sonnet-4-5",
  "gpt-5.2",
  "gpt-5.1",
  "gpt-5",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "kimi-k2.6",
  "gpt-5.4-mini",
  "gpt-5-mini",
  "qwen3.6-flash",
  "gemini-3.5-flash-lite",
  "gemma-4-31b",
  "gemma-4-26b",
  "claude-haiku-4-5",
  "gpt-5.4-nano",
  "gpt-5-nano",
  "gemini-3-pro-image",
  "gpt-image-2",
  "grok-imagine-image-2.0",
  "qwen-image-2.0-pro",
  "wan2.7-image-pro",
  "gemini-3.1-flash-image",
  "grok-imagine-image-quality",
  "ideogram-v4",
  "qwen-image-2.0",
  "wan2.7-image",
  "grok-imagine-image",
  "gemini-3.1-flash-lite-image",
  "z-image-turbo",
] as const;

const rankById = new Map<string, number>(STRENGTH_ORDER.map((id, index) => [id, index]));

function extractVersion(id: string): number {
  const dotted = id.match(/(\d+)\.(\d+)/);
  if (dotted) return Number(dotted[1]) + Number(dotted[2]) / 100;
  const dashed = id.match(/(\d+)-(\d+)/);
  if (dashed) return Number(dashed[1]) + Number(dashed[2]) / 100;
  const single = id.match(/(?:^|[^0-9])(\d+)(?:[^0-9]|$)/);
  return single ? Number(single[1]) : 0;
}

function extractTier(id: string): number {
  if (/nano|lite|haiku|turbo/.test(id)) return 0;
  if (/flash|mini/.test(id)) return 1;
  if (/plus|sonnet|luna/.test(id)) return 2;
  if (/terra|quality/.test(id)) return 3;
  if (/pro|max|opus|sol|fable|multi-agent|reasoning/.test(id)) return 5;
  return 4;
}

function unknownRank(id: string): number {
  const version = extractVersion(id);
  const tier = extractTier(id);
  return STRENGTH_ORDER.length + Math.round((99 - version) * 10) + (5 - tier);
}

export function modelStrengthRank(id: string): number {
  const key = canonicalModelUseId(id);
  return rankById.get(key) ?? unknownRank(key);
}

export function sortModelsByStrength<T extends { id: string }>(models: readonly T[]): T[] {
  return [...models].sort((left, right) => {
    const delta = modelStrengthRank(left.id) - modelStrengthRank(right.id);
    return delta !== 0 ? delta : left.id.localeCompare(right.id);
  });
}
