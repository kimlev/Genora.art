import type { StudioDictionary } from "@/lib/i18n/types";

/**
 * Интегратор присылает названия качества по-русски, а значения остаются стабильными
 * ключами. Переводим по значению и оставляем ответ провайдера только для незнакомых.
 */
export function imageQualityLabel(value: string, fallback: string, studio: StudioDictionary): string {
  const labels: Record<string, string> = {
    turbo: studio.qualityTurbo,
    default: studio.qualityDefault,
    quality: studio.qualityQuality,
    low: studio.qualityLow,
    medium: studio.qualityMedium,
    minimal: studio.qualityMinimal,
    high: studio.qualityHigh,
    on: studio.qualityOn,
    off: studio.qualityOff,
  };
  return labels[value] ?? fallback;
}
