import { agentKindOf } from "@/lib/agent-context";
import { IMAGE_AGENT_TAG_OF, type ImageAgentTag } from "@/lib/image-agent-gallery";
import type { Agent, AgentCategory } from "@/lib/mock/agent-types";
import { VIDEO_AGENT_TAGS } from "@/lib/video-agent-catalog";

export type SystemAgentKind = "text" | "images" | "video";

export function systemAgentKind(agent: Pick<Agent, "id" | "category">): SystemAgentKind {
  if (agent.category === "video") return "video";
  return agentKindOf(agent.category) === "images" ? "images" : "text";
}

export function systemAgentTag(agent: Pick<Agent, "id" | "category">, override?: string | null): string {
  if (override) return override;
  if (systemAgentKind(agent) === "video") return "entertainment";
  if (agent.category === "images") return IMAGE_AGENT_TAG_OF[agent.id] ?? "photo-processing";
  return agent.category;
}

export function categoryFromKind(kind: SystemAgentKind, tag?: string | null): AgentCategory {
  if (kind === "images") return "images";
  if (kind === "video") return "video";
  if (tag === "code" || tag === "writing" || tag === "analysis" || tag === "marketing") return tag;
  return "writing";
}

export const IMAGE_TAG_OPTIONS: Array<Exclude<ImageAgentTag, "all">> = [
  "photo-processing",
  "photo-poses",
  "face-retouch",
  "background",
  "photo-effects",
  "hair",
  "clothes",
  "locations",
  "design",
];

export const TEXT_TAG_OPTIONS: AgentCategory[] = ["writing", "code", "analysis", "marketing"];

export function systemAgentTagOptions(kind: SystemAgentKind): readonly string[] {
  if (kind === "images") return IMAGE_TAG_OPTIONS;
  if (kind === "video") return VIDEO_AGENT_TAGS;
  return TEXT_TAG_OPTIONS;
}

export function isSystemAgentTag(kind: SystemAgentKind, tag?: string | null): boolean {
  return typeof tag === "string" && systemAgentTagOptions(kind).includes(tag);
}
