import type { CommercialModel } from "@/lib/catalog/commercial-models";

export type ModelMetrics = {
  score: number;
  votes: number;
};

const modelMetrics = new Map<string, ModelMetrics>([
  ["gpt-6-astra", { score: 0, votes: 0 }],
  ["gpt-5.6-sol", { score: 1_984, votes: 4_860 }],
  ["gpt-5.6-terra", { score: 1_763, votes: 3_714 }],
  ["gpt-5.6-luna", { score: 1_217, votes: 1_842 }],
  ["gpt-5.5", { score: 1_842, votes: 4_470 }],
  ["gpt-5.5-pro", { score: 1_913, votes: 1_510 }],
  ["gpt-5.4", { score: 1_726, votes: 4_892 }],
  ["gpt-5.4-mini", { score: 1_398, votes: 4_655 }],
  ["gpt-5.4-nano", { score: 936, votes: 2_571 }],
  ["gpt-5.4-pro", { score: 1_887, votes: 2_108 }],
  ["gpt-5.2", { score: 1_631, votes: 4_388 }],
  ["gpt-5.2-pro", { score: 1_794, votes: 1_902 }],
  ["gpt-5.1", { score: 1_512, votes: 4_216 }],
  ["gpt-5", { score: 1_479, votes: 4_820 }],
  ["gpt-5-mini", { score: 1_108, votes: 4_772 }],
  ["gpt-5-nano", { score: 642, votes: 3_195 }],
  ["gpt-5-pro", { score: 1_699, votes: 2_462 }],
  ["o3", { score: 1_816, votes: 4_530 }],
  ["claude-fable-5", { score: 1_519, votes: 622 }],
  ["claude-opus-5", { score: 1_997, votes: 2_976 }],
  ["claude-sonnet-5", { score: 1_943, votes: 4_125 }],
  ["claude-opus-4-8", { score: 1_868, votes: 2_843 }],
  ["claude-opus-4-7", { score: 1_691, votes: 1_794 }],
  ["claude-sonnet-4-6", { score: 1_831, votes: 4_628 }],
  ["claude-opus-4-6", { score: 1_774, votes: 3_369 }],
  ["claude-opus-4-5", { score: 1_586, votes: 2_702 }],
  ["claude-sonnet-4-5", { score: 1_663, votes: 4_793 }],
  ["claude-haiku-4-5", { score: 1_179, votes: 4_011 }],
  ["kimi-k3", { score: 1_741, votes: 3_374 }],
  ["kimi-k2.6", { score: 1_286, votes: 2_840 }],
  ["kimi-k2.7-code", { score: 1_352, votes: 1_640 }],
  ["kimi-k2.7-code-highspeed", { score: 1_188, votes: 980 }],
  ["gpt-4.1", { score: 1_410, votes: 4_120 }],
  ["gpt-4.1-mini", { score: 1_086, votes: 3_840 }],
  ["gpt-4o-mini", { score: 974, votes: 4_210 }],
  ["gemini-3.5-flash", { score: 1_364, votes: 3_920 }],
  ["deepseek-v4-pro-0813", { score: 1_628, votes: 2_210 }],
  ["deepseek-v4-flash-0731", { score: 1_042, votes: 1_560 }],
  ["llama-4-maverick", { score: 1_318, votes: 2_740 }],
  ["llama-4-scout", { score: 1_086, votes: 1_890 }],
  ["minimax-m3", { score: 1_274, votes: 1_120 }],
  ["minimax-m2.7", { score: 1_148, votes: 860 }],
  ["qwen3.7-max", { score: 1_869, votes: 2_853 }],
  ["qwen3.7-plus", { score: 1_634, votes: 4_271 }],
  ["qwen3.6-flash", { score: 1_296, votes: 3_568 }],
  ["gemini-3.6-flash", { score: 1_528, votes: 4_421 }],
  ["gemini-3.5-flash-lite", { score: 812, votes: 3_648 }],
  ["gemini-3.1-pro-preview", { score: 1_906, votes: 4_740 }],
  ["gemma-4-26b", { score: 468, votes: 967 }],
  ["gemma-4-31b", { score: 721, votes: 1_186 }],
  ["grok-4.5", { score: 1_879, votes: 4_244 }],
  ["grok-4.3", { score: 1_614, votes: 3_108 }],
  ["grok-4.20-reasoning", { score: 1_788, votes: 3_261 }],
  ["grok-4.20", { score: 1_456, votes: 3_590 }],
  ["grok-4.20-multi-agent", { score: 1_324, votes: 1_428 }],
  ["grok-build-0.1", { score: 214, votes: 284 }],
]);

function hashName(value: string): number {
  return [...value].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 17);
}

export function getCommercialModelMetrics(model: Pick<CommercialModel, "id" | "name">): ModelMetrics {
  const exact = modelMetrics.get(model.id);
  if (exact) return exact;

  const hash = hashName(model.name);
  return {
    score: 100 + (hash % 1_901),
    votes: 250 + ((hash >>> 3) % 4_751),
  };
}

export function scoreWithFeedback(base: ModelMetrics, votes: number[]): ModelMetrics {
  if (votes.length === 0) return base;
  return {
    score: Math.max(0, Math.min(2_000, base.score + votes.reduce((total, vote) => total + vote, 0))),
    votes: Math.min(5_000, base.votes + votes.length),
  };
}
