export type AgentCategory = "code" | "writing" | "analysis" | "marketing" | "images" | "song" | "video";

export type Agent = {
  id: string;
  name: string;
  category: AgentCategory;
  description: string;
  modelId: string;
  systemPrompt: string;
  icon: string;
  popular?: boolean;
};
