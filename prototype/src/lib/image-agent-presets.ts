export type ImageAgentPreset = {
  provider: string;
  modelId: string;
  size: string;
  format: string;
  style: string;
};

const IMAGE_AGENT_PRESETS: Record<string, ImageAgentPreset> = {
  "character-card": {
    provider: "google",
    modelId: "gemini-3.1-flash-image",
    size: "2K",
    format: "1:1",
    style: "photorealistic",
  },
  "ai-character-card": {
    provider: "google",
    modelId: "gemini-3.1-flash-image",
    size: "2K",
    format: "1:1",
    style: "photorealistic",
  },
  "gta-filter": {
    provider: "openai",
    modelId: "gpt-image-2",
    size: "1K",
    format: "1:1",
    style: "illustration",
  },
};

export function imageAgentPreset(id: string): ImageAgentPreset | null {
  if (IMAGE_AGENT_EXPANSION_IDS.includes(id)) {
    return { provider: "openai", modelId: "gpt-image-2", size: "1.5K", format: "2:3", style: "photorealistic" };
  }
  return IMAGE_AGENT_PRESETS[id] ?? null;
}
import { IMAGE_AGENT_EXPANSION_IDS } from "@/lib/image-agent-expansions";
