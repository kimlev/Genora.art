import type { AgentCategory } from "@/lib/mock/agent-types";
import { imageStudioAgentHref, imageStudioHref } from "@/lib/routes";

export type AgentKind = "all" | "text" | "images" | "video";

export const AGENT_CONTEXTS: AgentCategory[] = ["images", "code", "writing", "analysis", "marketing", "song", "video"];
export const AGENT_BUILDER_CONTEXTS: AgentCategory[] = ["writing", "images", "video"];
export const TEXT_AGENT_SPECIALTIES = ["writing", "code", "analysis", "marketing"] as const;
export type AgentTextSpecialty = (typeof TEXT_AGENT_SPECIALTIES)[number];
export const AGENT_DESCRIPTION_MAX = 1_000;
/** Одна строка на карточке: шире — заголовок переносится. */
export const AGENT_NAME_MAX = 32;

export function isAgentCategory(value: unknown): value is AgentCategory {
  return typeof value === "string" && AGENT_CONTEXTS.includes(value as AgentCategory);
}

export function agentContextLabel(
  category: AgentCategory,
  copy: {
    contextImages: string;
    contextVideo: string;
    contextCode: string;
    contextText: string;
    contextAnalysis: string;
    contextMarketing: string;
    contextSong: string;
  },
): string {
  return {
    images: copy.contextImages,
    video: copy.contextVideo,
    code: copy.contextCode,
    writing: copy.contextText,
    analysis: copy.contextAnalysis,
    marketing: copy.contextMarketing,
    song: copy.contextSong,
  }[category];
}

export function agentKindOf(category: AgentCategory): AgentKind {
  if (category === "images") return "images";
  if (category === "video") return "video";
  if (category === "song") return "all";
  return "text";
}

export function toBuilderContext(category: AgentCategory): AgentCategory {
  return AGENT_BUILDER_CONTEXTS.includes(category) ? category : "writing";
}

export function agentLaunchHref(id: string, context: AgentCategory): string {
  if (context === "images") return imageStudioAgentHref(id);
  if (context === "video") return imageStudioHref(`tab=video&videoAgent=${encodeURIComponent(id)}`);
  return "/chat";
}
