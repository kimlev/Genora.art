function pickTemplate(userMessage: string, templates: readonly string[]): string {
  const index =
    Math.abs(
      userMessage.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0),
    ) % templates.length;
  return templates[index];
}

function randomDelayMs(): number {
  return 800 + Math.floor(Math.random() * 701);
}

export function estimateTokenCount(value: string): number {
  const compact = value.trim();
  if (!compact) return 0;
  const latinWords = compact.match(/[A-Za-z0-9_]+/g)?.length ?? 0;
  const otherCharacters = compact.replace(/[A-Za-z0-9_\s]/g, "").length;
  return Math.max(1, Math.ceil(latinWords * 1.25 + otherCharacters * 0.7 + compact.length / 18));
}

export function generateMockResponse(
  userMessage: string,
  modelId: string | null,
  templates: readonly string[],
): Promise<{ content: string; modelId: string; inputTokens: number; outputTokens: number }> {
  const resolvedModelId = modelId ?? "gpt-5.4";

  return new Promise((resolve) => {
    window.setTimeout(() => {
      const template = pickTemplate(userMessage, templates);
      resolve({
        content: template,
        modelId: resolvedModelId,
        inputTokens: estimateTokenCount(userMessage),
        outputTokens: estimateTokenCount(template),
      });
    }, randomDelayMs());
  });
}
