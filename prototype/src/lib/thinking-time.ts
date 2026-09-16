import { chatUiCopy } from "@/lib/i18n/copy/chat-ui";
import type { Locale } from "@/lib/i18n";

export function formatThinkingTime(milliseconds: number | undefined, locale: Locale = "en"): string {
  const totalSeconds = Math.max(1, Math.round((milliseconds ?? 0) / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return chatUiCopy(locale).thinkingDuration(minutes, seconds);
}
