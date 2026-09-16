import type { Locale } from "./types";

/** Языки, которые сайт реально показывает и переводит. Остальные скрыты. */
export const SERVED_LOCALE_CODES = [
  "en",
  "hi",
  "es",
  "fr",
  "ar",
  "pt",
  "ru",
  "de",
  "it",
  "tr",
  "pl",
  "sv",
  "cs",
] as const satisfies readonly Locale[];

export const RETIRED_LOCALE_CODES = ["zh", "ja", "ko", "nl", "el", "ro"] as const satisfies readonly Locale[];

export type ServedLocale = (typeof SERVED_LOCALE_CODES)[number];

export function isServedLocale(value: string): value is ServedLocale {
  return (SERVED_LOCALE_CODES as readonly string[]).includes(value);
}

export function isRetiredLocale(value: string): boolean {
  return (RETIRED_LOCALE_CODES as readonly string[]).includes(value);
}
