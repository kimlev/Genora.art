import { ar } from "./locales/ar";
import { cs } from "./locales/cs";
import { de } from "./locales/de";
import { el } from "./locales/el";
import { en } from "./locales/en";
import { es } from "./locales/es";
import { fr } from "./locales/fr";
import { hi } from "./locales/hi";
import { it } from "./locales/it";
import { ja } from "./locales/ja";
import { ko } from "./locales/ko";
import { nl } from "./locales/nl";
import { pl } from "./locales/pl";
import { pt } from "./locales/pt";
import { ro } from "./locales/ro";
import { ru } from "./locales/ru";
import { sv } from "./locales/sv";
import { tr } from "./locales/tr";
import { zh } from "./locales/zh";
import { isServedLocale } from "./served-locales";
import type { Dictionary, Locale } from "./types";
import { LOCALE_STORAGE_KEY } from "./types";

export { RETIRED_LOCALE_CODES, SERVED_LOCALE_CODES, isRetiredLocale, isServedLocale } from "./served-locales";

export { LOCALE_STORAGE_KEY };
export type { Dictionary, Locale };

export const defaultLocale: Locale = "ru";

export type LocaleOption = {
  code: Locale;
  /** Название языка на нём самом */
  label: string;
  /** Короткая метка для кнопки */
  short: string;
  /** Тег для Intl и атрибута lang */
  intl: string;
  /** Флаг страны, визуально связанной с языком */
  flag: string;
  rtl?: boolean;
};

/** Языки интерфейса сайта и личного кабинета */
const allLocaleOptions: LocaleOption[] = [
  { code: "en", label: "English", short: "EN", intl: "en-US", flag: "🇬🇧" },
  { code: "hi", label: "हिन्दी", short: "HI", intl: "hi-IN", flag: "🇮🇳" },
  { code: "es", label: "Español", short: "ES", intl: "es-ES", flag: "🇪🇸" },
  { code: "fr", label: "Français", short: "FR", intl: "fr-FR", flag: "🇫🇷" },
  { code: "ar", label: "العربية", short: "AR", intl: "ar-SA", flag: "🇸🇦", rtl: true },
  { code: "pt", label: "Português", short: "PT", intl: "pt-BR", flag: "🇧🇷" },
  { code: "ru", label: "Русский", short: "RU", intl: "ru-RU", flag: "🇷🇺" },
  { code: "de", label: "Deutsch", short: "DE", intl: "de-DE", flag: "🇩🇪" },
  { code: "it", label: "Italiano", short: "IT", intl: "it-IT", flag: "🇮🇹" },
  { code: "tr", label: "Türkçe", short: "TR", intl: "tr-TR", flag: "🇹🇷" },
  { code: "pl", label: "Polski", short: "PL", intl: "pl-PL", flag: "🇵🇱" },
  { code: "sv", label: "Svenska", short: "SV", intl: "sv-SE", flag: "🇸🇪" },
  { code: "cs", label: "Čeština", short: "CS", intl: "cs-CZ", flag: "🇨🇿" },
  { code: "zh", label: "中文", short: "ZH", intl: "zh-CN", flag: "🇨🇳" },
  { code: "ja", label: "日本語", short: "JA", intl: "ja-JP", flag: "🇯🇵" },
  { code: "ko", label: "한국어", short: "KO", intl: "ko-KR", flag: "🇰🇷" },
  { code: "nl", label: "Nederlands", short: "NL", intl: "nl-NL", flag: "🇳🇱" },
  { code: "el", label: "Ελληνικά", short: "EL", intl: "el-GR", flag: "🇬🇷" },
  { code: "ro", label: "Română", short: "RO", intl: "ro-RO", flag: "🇷🇴" },
];

/** Только языки, которые сайт сейчас обслуживает */
export const localeOptions: LocaleOption[] = allLocaleOptions.filter((option) => isServedLocale(option.code));

export function isLocale(value: string): value is Locale {
  return localeOptions.some((option) => option.code === value);
}

export function getLocaleOption(locale: Locale): LocaleOption {
  return (
    localeOptions.find((option) => option.code === locale)
    ?? allLocaleOptions.find((option) => option.code === locale)
    ?? localeOptions[0]
  );
}

const dictionaries: Record<Locale, Dictionary> = {
  ru,
  en,
  zh,
  hi,
  es,
  fr,
  ar,
  pt,
  de,
  ja,
  it,
  ko,
  tr,
  pl,
  nl,
  sv,
  cs,
  el,
  ro,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? en;
}
