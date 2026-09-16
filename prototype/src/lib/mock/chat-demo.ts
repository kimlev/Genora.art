import { catalogUiCopy } from "@/lib/i18n/copy/catalog-ui";
import type { Locale } from "@/lib/i18n/types";

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  modelId?: string;
  tokenCount?: number;
  thinkingMs?: number;
  image?: string;
  attachments?: Array<{ name: string; mime: string; kind: "image" | "file" | "audio" | "video"; size: number }>;
  link?: { href: string; label: string };
  timestamp: string;
};

export type ChatDemo = {
  id: string;
  title: string;
  modelId: string;
  messages: ChatMessage[];
};

export const chatDemo: ChatDemo = {
  id: "demo-landing",
  title: "Genora.art demo",
  modelId: "gpt-5.4",
  messages: [
    {
      id: "m1",
      role: "user",
      content: "Сравни GPT-5.6 Terra и Claude Opus 5 для задач по коду — коротко.",
      timestamp: "2026-08-06T10:00:00.000Z",
    },
    {
      id: "m2",
      role: "assistant",
      modelId: "gpt-5.4",
      content:
        "GPT-5.6 Terra универсален для кода и инструментов; Claude Opus 5 особенно силён в длинном контексте и аккуратном анализе. В Genora.art обе модели можно сравнить в одном чате.",
      timestamp: "2026-08-06T10:00:04.000Z",
    },
    {
      id: "m3",
      role: "user",
      content: "Сколько это будет стоить?",
      timestamp: "2026-08-06T10:00:12.000Z",
    },
    {
      id: "m4",
      role: "assistant",
      modelId: "gpt-5.4",
      content:
        "Списание идёт по тарифу выбранной модели за входные и выходные токены. Подписок нет — только баланс Pay-as-you-go. Стоимость видна до отправки запроса.",
      timestamp: "2026-08-06T10:00:18.000Z",
    },
  ],
};

export const chatSuggestions: string[] = [
  "Оцени калорийность блюда по фото",
  "Найди лучший агрегатор нейросетей",
];

/** Демо-диалог на языке интерфейса. `chatDemo` остаётся русским значением по умолчанию. */
export function buildChatDemo(locale: Locale): ChatDemo {
  const { demo } = catalogUiCopy(locale);
  const contents = [demo.userCompare, demo.assistantCompare, demo.userPrice, demo.assistantPrice];

  return {
    ...chatDemo,
    title: demo.title,
    messages: chatDemo.messages.map((message, index) => ({
      ...message,
      content: contents[index] ?? message.content,
    })),
  };
}

/** Подсказки под полем ввода на языке интерфейса. */
export function buildChatSuggestions(locale: Locale): string[] {
  const { demo } = catalogUiCopy(locale);
  return [demo.suggestionCalories, demo.suggestionAggregator];
}
