import type { Locale } from "./types";
import { IS_STAGING } from "@/lib/site-env";

/** Языки, которые сайт реально показывает и переводит. Остальные скрыты. */
const ALL_SERVED_LOCALE_CODES = [
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

export type ServedLocale = (typeof ALL_SERVED_LOCALE_CODES)[number];

/** Русская витрина остаётся доступной на dev, но не публикуется на production. */
export const SERVED_LOCALE_CODES: readonly ServedLocale[] = IS_STAGING
  ? ALL_SERVED_LOCALE_CODES
  : ALL_SERVED_LOCALE_CODES.filter((code) => code !== "ru");

export const RETIRED_LOCALE_CODES = ["zh", "ja", "ko", "nl", "el", "ro"] as const satisfies readonly Locale[];

export function isServedLocale(value: string): value is ServedLocale {
  return (SERVED_LOCALE_CODES as readonly string[]).includes(value);
}

export function isRetiredLocale(value: string): boolean {
  return (RETIRED_LOCALE_CODES as readonly string[]).includes(value);
}
