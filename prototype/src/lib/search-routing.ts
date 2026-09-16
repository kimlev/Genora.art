import type { Locale } from "@/lib/i18n";

/** Куда отправлять страницу на индексацию */
export type SearchTarget = "yandex" | "google";

/**
 * Google индексирует сайт на всех языках, включая русский.
 * Яндекс получает только русские адреса: другие языки он всё равно не продвигает.
 */
export function searchTargetsForLocale(locale: Locale): SearchTarget[] {
  return locale === "ru" ? ["yandex", "google"] : ["google"];
}
