import { usageHistoryCopy } from "@/lib/usage-history-copy";
import type { Locale } from "@/lib/i18n/types";

export type UsageKind = "chat" | "image" | "video" | "song";

const LOCALES: readonly Locale[] = [
  "ru", "en", "zh", "hi", "es", "fr", "ar", "pt", "de", "ja", "it", "ko", "tr", "pl", "nl", "sv", "cs", "el", "ro",
];

const TYPE_PLACEHOLDERS = new Set([
  "video",
  "песня",
  "song",
  "music",
  "музыка ии",
  "песня ии",
]);

let placeholderCache: Set<string> | null = null;

function placeholderAgents(): Set<string> {
  if (placeholderCache) return placeholderCache;
  const set = new Set<string>();
  for (const item of TYPE_PLACEHOLDERS) set.add(item);
  for (const locale of LOCALES) {
    const copy = usageHistoryCopy(locale);
    set.add(copy.noAgent.trim().toLowerCase());
    set.add(copy.imageAgentFallback.trim().toLowerCase());
  }
  placeholderCache = set;
  return set;
}

export function usageKindFromId(id: string): UsageKind {
  return usageKindFromEntry(id);
}

export function usageKindFromEntry(id: string, modelId?: string | null): UsageKind {
  const model = String(modelId ?? "");
  if (id.startsWith("video-") || model.startsWith("video:")) return "video";
  if (id.startsWith("image-") || model.startsWith("image:")) return "image";
  if (id.startsWith("music-") || model.startsWith("music:")) return "song";
  return "chat";
}

export function displayUsageAgent(agent: string | null | undefined): string {
  const value = (agent ?? "").trim();
  if (!value) return "";
  return placeholderAgents().has(value.toLowerCase()) ? "" : value;
}
