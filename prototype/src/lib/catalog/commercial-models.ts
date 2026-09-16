export type CommercialModel = {
  id: string;
  name: string;
  provider: string;
  inputPer1MUsd: number;
  cachedInputPer1MUsd?: number;
  outputPer1MUsd: number;
};

const MARKUP = 2.5;

const sourceModels: CommercialModel[] = [
  // Integrator catalog, 2026-09-09 (includes its provider-side fee).
  { id: "gpt-6-astra", name: "GPT-6 Astra", provider: "OpenAI", inputPer1MUsd: 10.3, cachedInputPer1MUsd: 1.03, outputPer1MUsd: 51.5 },
  { id: "gpt-5.6-sol", name: "GPT-5.6 Sol", provider: "OpenAI", inputPer1MUsd: 5, cachedInputPer1MUsd: 0.5, outputPer1MUsd: 30 },
  { id: "gpt-5.6-terra", name: "GPT-5.6 Terra", provider: "OpenAI", inputPer1MUsd: 2, cachedInputPer1MUsd: 0.2, outputPer1MUsd: 12 },
  { id: "gpt-5.6-luna", name: "GPT-5.6 Luna", provider: "OpenAI", inputPer1MUsd: 0.2, cachedInputPer1MUsd: 0.02, outputPer1MUsd: 1.2 },
  { id: "gpt-5.5", name: "GPT-5.5", provider: "OpenAI", inputPer1MUsd: 5, outputPer1MUsd: 30 },
  { id: "gpt-5.5-pro", name: "GPT-5.5 Pro", provider: "OpenAI", inputPer1MUsd: 30, outputPer1MUsd: 180 },
  { id: "gpt-5.4", name: "GPT-5.4", provider: "OpenAI", inputPer1MUsd: 2.5, outputPer1MUsd: 15 },
  { id: "gpt-5.4-mini", name: "GPT-5.4 mini", provider: "OpenAI", inputPer1MUsd: 0.75, outputPer1MUsd: 4.5 },
  { id: "gpt-5.4-nano", name: "GPT-5.4 nano", provider: "OpenAI", inputPer1MUsd: 0.2, outputPer1MUsd: 1.25 },
  { id: "gpt-5.4-pro", name: "GPT-5.4 Pro", provider: "OpenAI", inputPer1MUsd: 30, outputPer1MUsd: 180 },
  { id: "gpt-5.2", name: "GPT-5.2", provider: "OpenAI", inputPer1MUsd: 1.75, outputPer1MUsd: 14 },
  { id: "gpt-5.2-pro", name: "GPT-5.2 Pro", provider: "OpenAI", inputPer1MUsd: 21, outputPer1MUsd: 168 },
  { id: "gpt-5.1", name: "GPT-5.1", provider: "OpenAI", inputPer1MUsd: 1.25, outputPer1MUsd: 10 },
  { id: "gpt-5", name: "GPT-5", provider: "OpenAI", inputPer1MUsd: 1.25, outputPer1MUsd: 10 },
  { id: "gpt-5-mini", name: "GPT-5 mini", provider: "OpenAI", inputPer1MUsd: 0.25, outputPer1MUsd: 2 },
  { id: "gpt-5-nano", name: "GPT-5 nano", provider: "OpenAI", inputPer1MUsd: 0.05, outputPer1MUsd: 0.4 },
  { id: "gpt-5-pro", name: "GPT-5 Pro", provider: "OpenAI", inputPer1MUsd: 15, outputPer1MUsd: 120 },
  { id: "o3", name: "o3", provider: "OpenAI", inputPer1MUsd: 2, cachedInputPer1MUsd: 0.5, outputPer1MUsd: 8 },
  { id: "gpt-4.1", name: "GPT-4.1", provider: "OpenAI", inputPer1MUsd: 2, cachedInputPer1MUsd: 0.5, outputPer1MUsd: 8 },
  { id: "gpt-4.1-mini", name: "GPT-4.1 mini", provider: "OpenAI", inputPer1MUsd: 0.4, cachedInputPer1MUsd: 0.1, outputPer1MUsd: 1.6 },
  { id: "gpt-4o-mini", name: "GPT-4o mini", provider: "OpenAI", inputPer1MUsd: 0.15, cachedInputPer1MUsd: 0.075, outputPer1MUsd: 0.6 },
  { id: "claude-fable-5", name: "Claude Fable 5", provider: "Anthropic", inputPer1MUsd: 10, outputPer1MUsd: 50 },
  { id: "claude-opus-5", name: "Claude Opus 5", provider: "Anthropic", inputPer1MUsd: 5, outputPer1MUsd: 25 },
  { id: "claude-sonnet-5", name: "Claude Sonnet 5", provider: "Anthropic", inputPer1MUsd: 2, outputPer1MUsd: 10 },
  { id: "claude-opus-4-8", name: "Claude Opus 4.8", provider: "Anthropic", inputPer1MUsd: 5, outputPer1MUsd: 25 },
  { id: "claude-opus-4-7", name: "Claude Opus 4.7", provider: "Anthropic", inputPer1MUsd: 5, outputPer1MUsd: 25 },
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", provider: "Anthropic", inputPer1MUsd: 3, outputPer1MUsd: 15 },
  { id: "claude-opus-4-6", name: "Claude Opus 4.6", provider: "Anthropic", inputPer1MUsd: 5, outputPer1MUsd: 25 },
  { id: "claude-opus-4-5", name: "Claude Opus 4.5", provider: "Anthropic", inputPer1MUsd: 5, outputPer1MUsd: 25 },
  { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", provider: "Anthropic", inputPer1MUsd: 3, outputPer1MUsd: 15 },
  { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", provider: "Anthropic", inputPer1MUsd: 1, outputPer1MUsd: 5 },
  { id: "kimi-k3", name: "Kimi K3", provider: "Kimi", inputPer1MUsd: 1, outputPer1MUsd: 3 },
  { id: "kimi-k2.6", name: "Kimi K2.6", provider: "Kimi", inputPer1MUsd: 0.6, outputPer1MUsd: 2.5 },
  { id: "kimi-k2.7-code", name: "Kimi K2.7 Code", provider: "Kimi", inputPer1MUsd: 0.6, outputPer1MUsd: 2.5 },
  { id: "kimi-k2.7-code-highspeed", name: "Kimi K2.7 Code Highspeed", provider: "Kimi", inputPer1MUsd: 0.6, outputPer1MUsd: 2.5 },
  { id: "qwen3.7-max", name: "Qwen 3.7 Max", provider: "Alibaba", inputPer1MUsd: 2.5, cachedInputPer1MUsd: 0.25, outputPer1MUsd: 7.5 },
  { id: "qwen3.7-plus", name: "Qwen 3.7 Plus", provider: "Alibaba", inputPer1MUsd: 0.4, cachedInputPer1MUsd: 0.04, outputPer1MUsd: 1.6 },
  { id: "qwen3.6-flash", name: "Qwen 3.6 Flash", provider: "Alibaba", inputPer1MUsd: 0.25, cachedInputPer1MUsd: 0.025, outputPer1MUsd: 1.5 },
  { id: "qwen3.8-max", name: "Qwen 3.8 Max", provider: "Alibaba", inputPer1MUsd: 2, cachedInputPer1MUsd: 0.2, outputPer1MUsd: 6 },
  { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", provider: "Google", inputPer1MUsd: 0.75, cachedInputPer1MUsd: 0.075, outputPer1MUsd: 3.75 },
  { id: "gemini-3.7-flash", name: "Gemini 3.7 Flash", provider: "Google", inputPer1MUsd: 0.75, cachedInputPer1MUsd: 0.075, outputPer1MUsd: 3.75 },
  { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash", provider: "Google", inputPer1MUsd: 1.5, cachedInputPer1MUsd: 0.15, outputPer1MUsd: 7.5 },
  { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", provider: "Google", inputPer1MUsd: 1.5, cachedInputPer1MUsd: 0.15, outputPer1MUsd: 9 },
  { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash-Lite", provider: "Google", inputPer1MUsd: 0.3, cachedInputPer1MUsd: 0.03, outputPer1MUsd: 2.5 },
  { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview", provider: "Google", inputPer1MUsd: 2, outputPer1MUsd: 12 },
  { id: "gemma-4-26b", name: "Gemma 4 26B", provider: "Google", inputPer1MUsd: 0, outputPer1MUsd: 0 },
  { id: "gemma-4-31b", name: "Gemma 4 31B", provider: "Google", inputPer1MUsd: 0, outputPer1MUsd: 0 },
  { id: "grok-4.5", name: "Grok 4.5", provider: "xAI", inputPer1MUsd: 2, cachedInputPer1MUsd: 0.3, outputPer1MUsd: 6 },
  { id: "grok-4.3", name: "Grok 4.3", provider: "xAI", inputPer1MUsd: 1.25, cachedInputPer1MUsd: 0.2, outputPer1MUsd: 2.5 },
  { id: "grok-4.20-reasoning", name: "Grok 4.20 Reasoning", provider: "xAI", inputPer1MUsd: 1.25, cachedInputPer1MUsd: 0.2, outputPer1MUsd: 2.5 },
  { id: "grok-4.20", name: "Grok 4.20", provider: "xAI", inputPer1MUsd: 1.25, cachedInputPer1MUsd: 0.2, outputPer1MUsd: 2.5 },
  { id: "grok-4.20-multi-agent", name: "Grok 4.20 Multi-Agent", provider: "xAI", inputPer1MUsd: 1.25, cachedInputPer1MUsd: 0.2, outputPer1MUsd: 2.5 },
  { id: "grok-build-0.1", name: "Grok Build 0.1", provider: "xAI", inputPer1MUsd: 1, cachedInputPer1MUsd: 0.2, outputPer1MUsd: 2 },
  { id: "deepseek-v4-pro-0813", name: "DeepSeek V4 Pro", provider: "DeepSeek", inputPer1MUsd: 1.122, outputPer1MUsd: 3.366 },
  { id: "deepseek-v4-flash-0731", name: "DeepSeek V4 Flash", provider: "DeepSeek", inputPer1MUsd: 0.04, outputPer1MUsd: 0.08 },
  { id: "llama-4-maverick", name: "Llama 4 Maverick", provider: "Meta", inputPer1MUsd: 0.2, outputPer1MUsd: 0.8 },
  { id: "llama-4-scout", name: "Llama 4 Scout", provider: "Meta", inputPer1MUsd: 0.1, outputPer1MUsd: 0.3 },
  { id: "minimax-m3", name: "MiniMax M3", provider: "MiniMax", inputPer1MUsd: 0.3, outputPer1MUsd: 1.2 },
  { id: "minimax-m2.7", name: "MiniMax M2.7", provider: "MiniMax", inputPer1MUsd: 0.3, outputPer1MUsd: 1.2 },
];

export const commercialModels = sourceModels.map((model) => ({
  ...model,
  inputPer1MUsd: model.inputPer1MUsd * MARKUP,
  cachedInputPer1MUsd:
    model.cachedInputPer1MUsd === undefined
      ? undefined
      : model.cachedInputPer1MUsd * MARKUP,
  outputPer1MUsd: model.outputPer1MUsd * MARKUP,
}));

export const commercialMarkup = MARKUP;
export const pricingVerifiedAt = "2026-08-25";
