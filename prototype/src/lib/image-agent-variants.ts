export type ImageAgentVariant = {
  id: string;
  prompt: string;
  thumb: string;
};

/** Мини-варианты. Текст уходит в USER ADDITIONS скрытно, поле промта не трогаем. */
export const IMAGE_AGENT_VARIANTS: Record<string, ImageAgentVariant[]> = {
  "add-makeup": [
    {
      id: "natural",
      prompt: "Visible natural everyday makeup: even skin, peach blush, brown mascara, soft eyeliner, tinted coral-pink lipstick. Must look made-up, not bare-faced.",
      thumb: "/agents/add-makeup-natural.jpg",
    },
    {
      id: "evening",
      prompt: "Evening glamour makeup: defined smoky eyes, winged liner, contoured cheeks, glossy berry lipstick.",
      thumb: "/agents/add-makeup-evening.jpg",
    },
    {
      id: "editorial",
      prompt: "Editorial makeup: graphic black eyeliner, bold color accent, fashion-magazine finish, stained dark-rose lips.",
      thumb: "/agents/add-makeup-editorial.jpg",
    },
  ],
  "plump-lips": [
    {
      id: "subtle",
      prompt: "Enlarged lips: clearly bigger than natural, fuller upper and lower lip, still balanced and realistic.",
      thumb: "/agents/plump-lips-subtle.jpg",
    },
    {
      id: "medium",
      prompt: "Large plump lips: very full, obvious filler volume, still the same person.",
      thumb: "/agents/plump-lips-medium.jpg",
    },
    {
      id: "full",
      prompt: "Extreme silicone-model lips: heavily overfilled, very large pouty lips like a silicone doll, still the same face and identity.",
      thumb: "/agents/plump-lips-full.jpg",
    },
  ],
};

export function imageAgentVariants(id: string): ImageAgentVariant[] {
  return IMAGE_AGENT_VARIANTS[id] ?? [];
}

export function defaultImageAgentVariant(id: string): ImageAgentVariant | undefined {
  const items = IMAGE_AGENT_VARIANTS[id];
  if (!items?.length) return undefined;
  const preferred = id === "add-makeup" ? "evening" : id === "plump-lips" ? "medium" : items[0].id;
  return items.find((item) => item.id === preferred) ?? items[0];
}

export function imageAgentVariantNotes(agentId: string, selectedVariantId: string, userPrompt: string): string {
  const variant = imageAgentVariants(agentId).find((item) => item.id === selectedVariantId);
  return [variant?.prompt ?? "", userPrompt.trim()].filter(Boolean).join("\n");
}

/** Ключ адресной строки студии — чтобы не применять один и тот же ?agent повторно. */
export function imageStudioQueryKey(agent: string, template: string, tab: string | null): string {
  return `${agent}|${template}|${tab ?? ""}`;
}

/**
 * Агент из адресной строки только если хук Next совпадает с window.location.
 * Иначе prefetch соседней карточки может подменить агента, не меняя адрес.
 */
export function liveImageStudioQuery(
  hookAgent: string,
  hookTemplate: string,
  hookTab: string | null,
  search: string,
): { agent: string; template: string; tab: string | null } | null {
  const live = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const agent = live.get("agent") ?? "";
  const template = live.get("template") ?? "";
  const tab = live.get("tab");
  if (hookAgent !== agent || hookTemplate !== template || (hookTab ?? "") !== (tab ?? "")) return null;
  return { agent, template, tab };
}
