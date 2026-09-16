import { catalogUiCopy } from "@/lib/i18n/copy/catalog-ui";
import type { Locale } from "@/lib/i18n/types";

export type ModelProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "meta"
  | "mistral"
  | "deepseek"
  | "alibaba"
  | "moonshot"
  | "zai"
  | "xai";

export type AiModel = {
  id: string;
  name: string;
  provider: ModelProvider;
  description: string;
  contextWindow: number;
  inputPricePer1M: number;
  outputPricePer1M: number;
  tags: string[];
  featured?: boolean;
  /** Arena-оценка (Elo) и число голосов из публичного лидерборда */
  score: number;
  votes: number;
};

export const providerLabels: Record<ModelProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  meta: "Meta",
  mistral: "Mistral",
  deepseek: "DeepSeek",
  alibaba: "Alibaba",
  moonshot: "Kimi",
  zai: "Z.ai",
  xai: "xAI",
};

/**
 * Оценки и голоса — текстовый лидерборд LMArena (arena.ai), срез 06.08.2026.
 * Цены и контекст — каталог OpenRouter (openrouter.ai/api/v1/models).
 */
export const models: AiModel[] = [
  {
    id: "claude-opus-4-6",
    name: "Claude Opus 4.6",
    provider: "anthropic",
    description: "Лидер арены: сложные рассуждения, код и работа с агентами.",
    contextWindow: 1_000_000,
    inputPricePer1M: 2.5,
    outputPricePer1M: 12.5,
    tags: ["chat", "code", "reasoning"],
    featured: true,
    score: 1518,
    votes: 11_826,
  },
  {
    id: "claude-fable-5",
    name: "Claude Fable 5",
    provider: "anthropic",
    description: "Максимальное качество текста для редактуры и длинных работ.",
    contextWindow: 1_000_000,
    inputPricePer1M: 10,
    outputPricePer1M: 50,
    tags: ["writing", "analysis"],
    score: 1517,
    votes: 3_253,
  },
  {
    id: "qwen-3-8-max",
    name: "Qwen3.8 Max",
    provider: "alibaba",
    description: "Мультимодальная модель с сильным соотношением цены и качества.",
    contextWindow: 1_000_000,
    inputPricePer1M: 2,
    outputPricePer1M: 6,
    tags: ["chat", "vision"],
    score: 1514,
    votes: 733,
  },
  {
    id: "claude-opus-4-8",
    name: "Claude Opus 4.8",
    provider: "anthropic",
    description: "Агентные сценарии, работа с инструментами и большие проекты.",
    contextWindow: 1_000_000,
    inputPricePer1M: 2.5,
    outputPricePer1M: 12.5,
    tags: ["agents", "code"],
    featured: true,
    score: 1500,
    votes: 6_950,
  },
  {
    id: "kimi-k3-max",
    name: "Kimi K3 Max",
    provider: "moonshot",
    description: "Открытые веса и лидерство во фронтенд-коде.",
    contextWindow: 1_048_576,
    inputPricePer1M: 3,
    outputPricePer1M: 15,
    tags: ["code", "open"],
    score: 1499,
    votes: 1_528,
  },
  {
    id: "gemini-3-pro",
    name: "Gemini 3 Pro",
    provider: "google",
    description: "Наука, длинный контекст и мультимодальные материалы.",
    contextWindow: 1_048_576,
    inputPricePer1M: 2,
    outputPricePer1M: 12,
    tags: ["chat", "vision", "research"],
    featured: true,
    score: 1495,
    votes: 6_765,
  },
  {
    id: "gpt-5-4",
    name: "GPT-5.4",
    provider: "openai",
    description: "Универсальный флагман для текста, кода и работы с файлами.",
    contextWindow: 1_100_000,
    inputPricePer1M: 2.5,
    outputPricePer1M: 15,
    tags: ["chat", "code", "vision"],
    featured: true,
    score: 1495,
    votes: 11_173,
  },
  {
    id: "gemini-3-1-pro",
    name: "Gemini 3.1 Pro",
    provider: "google",
    description: "Самая обсуждаемая модель арены: точность при умеренной цене.",
    contextWindow: 1_048_576,
    inputPricePer1M: 1,
    outputPricePer1M: 6,
    tags: ["chat", "research"],
    featured: true,
    score: 1492,
    votes: 15_872,
  },
  {
    id: "gemini-3-6-flash",
    name: "Gemini 3.6 Flash",
    provider: "google",
    description: "Быстрые ответы и черновики по низкой цене.",
    contextWindow: 1_048_576,
    inputPricePer1M: 0.75,
    outputPricePer1M: 3.75,
    tags: ["fast", "chat"],
    score: 1488,
    votes: 1_852,
  },
  {
    id: "gpt-5-5",
    name: "GPT-5.5",
    provider: "openai",
    description: "Рабочая лошадка для повседневных задач и диалогов.",
    contextWindow: 1_100_000,
    inputPricePer1M: 2.5,
    outputPricePer1M: 15,
    tags: ["chat", "code"],
    score: 1481,
    votes: 9_417,
  },
  {
    id: "glm-5-1",
    name: "GLM 5.1",
    provider: "zai",
    description: "Открытая лицензия MIT и низкая стоимость запроса.",
    contextWindow: 202_800,
    inputPricePer1M: 1.4,
    outputPricePer1M: 4.4,
    tags: ["open", "chat"],
    score: 1480,
    votes: 6_070,
  },
  {
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    provider: "anthropic",
    description: "Баланс качества и цены для продакшн-нагрузки.",
    contextWindow: 1_000_000,
    inputPricePer1M: 1.5,
    outputPricePer1M: 7.5,
    tags: ["chat", "analysis"],
    featured: true,
    score: 1480,
    votes: 11_469,
  },
  {
    id: "grok-4-20",
    name: "Grok 4.20",
    provider: "xai",
    description: "Контекст до 2M токенов и доступ к свежим данным.",
    contextWindow: 2_000_000,
    inputPricePer1M: 2,
    outputPricePer1M: 6,
    tags: ["chat", "realtime"],
    score: 1480,
    votes: 11_264,
  },
  {
    id: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    provider: "deepseek",
    description: "Открытые веса и лучшая цена среди сильных моделей.",
    contextWindow: 1_000_000,
    inputPricePer1M: 0.43,
    outputPricePer1M: 0.87,
    tags: ["code", "open", "budget"],
    score: 1474,
    votes: 9_251,
  },
  {
    id: "mistral-large-3",
    name: "Mistral Large 3",
    provider: "mistral",
    description: "Европейская модель Apache 2.0 для многоязычных сценариев.",
    contextWindow: 262_144,
    inputPricePer1M: 0.5,
    outputPricePer1M: 1.5,
    tags: ["multilingual", "open"],
    score: 1422,
    votes: 9_787,
  },
  {
    id: "llama-4-maverick",
    name: "Llama 4 Maverick",
    provider: "meta",
    description: "Открытая модель Meta для собственных развёртываний.",
    contextWindow: 131_072,
    inputPricePer1M: 0.63,
    outputPricePer1M: 1.8,
    tags: ["open", "chat"],
    score: 1325,
    votes: 6_830,
  },
];

export function getModelById(id: string): AiModel | undefined {
  return models.find((model) => model.id === id);
}

export function getFeaturedModels(): AiModel[] {
  return models.filter((model) => model.featured);
}

/**
 * Описание модели на языке интерфейса. Названия моделей и провайдеров
 * не переводятся, поэтому локализуется только описание.
 */
export function modelDescription(id: string, locale: Locale): string {
  const localized = catalogUiCopy(locale).models[id];
  if (localized) return localized;
  if (locale === "ru") return getModelById(id)?.description ?? "";
  return catalogUiCopy("en").models[id] ?? getModelById(id)?.description ?? "";
}
