import type { ChatMessage } from "@/lib/mock/chat-demo";
import type { Dictionary } from "@/lib/i18n";
import { catalogUiCopy } from "@/lib/i18n/copy/catalog-ui";
import type { Locale } from "@/lib/i18n/types";

export type Conversation = {
  id: string;
  title: string;
  updatedAt: string;
  modelId: string | null;
  providerId: string | null;
  depthId: string | null;
  agentId: string | null;
  messages: ChatMessage[];
};

const conversationMeta: Array<
  Pick<Conversation, "id" | "updatedAt" | "modelId" | "agentId">
> = [
  {
    id: "conv-1",
    updatedAt: "2026-08-06T10:00:00.000Z",
    modelId: "gpt-5.4",
    agentId: null,
  },
  {
    id: "conv-3",
    updatedAt: "2026-08-04T09:15:00.000Z",
    modelId: "gemini-3.6-flash",
    agentId: null,
  },
  {
    id: "conv-4",
    updatedAt: "2026-08-03T18:00:00.000Z",
    modelId: "gpt-5.6-terra",
    agentId: null,
  },
];

/**
 * `locale` нужен только для подписи ссылки в демо-переписке: остальной текст
 * приходит уже локализованным из `dictionary`. Без него подпись остаётся русской.
 */
export function buildMockConversations(
  dictionary: Dictionary,
  locale: Locale = "ru",
): Conversation[] {
  const linkLabel = catalogUiCopy(locale).demo.aggregatorLinkLabel;

  return dictionary.chat.conversations.map((conversation) => {
    const meta = conversationMeta.find((item) => item.id === conversation.id);

    return {
      id: conversation.id,
      title: conversation.title,
      updatedAt: meta?.updatedAt ?? new Date().toISOString(),
      modelId: meta?.modelId ?? null,
      providerId: null,
      depthId: null,
      agentId: meta?.agentId ?? null,
      messages: conversation.messages.map((message, index) => ({
        id: `${conversation.id}-m${index + 1}`,
        role: message.role,
        content: message.content,
        modelId:
          message.role === "assistant" ? (meta?.modelId ?? undefined) : undefined,
        timestamp: meta?.updatedAt ?? new Date().toISOString(),
        image: conversation.id === "conv-3" && index === 0 ? "/demo/calorie-meal.png" : undefined,
        link:
          conversation.id === "conv-4" && index === 1
            ? { href: "https://genora.art", label: linkLabel }
            : undefined,
      })),
    };
  });
}
