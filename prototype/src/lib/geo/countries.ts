import { countryCodes, countryCurrencies } from "./country-currencies";

export type CountryOption = {
  /** ISO 3166-1 alpha-2 */
  code: string;
  /** Название на языке интерфейса */
  name: string;
  /** Национальная валюта, ISO 4217 */
  currency: string;
  /** Флаг эмодзи */
  flag: string;
};

const REGIONAL_INDICATOR_OFFSET = 0x1f1e6 - "A".charCodeAt(0);

/** Флаг собирается из кода страны парой regional indicator, отдельных картинок не нужно. */
export function countryFlag(code: string): string {
  const upper = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return "";
  return String.fromCodePoint(
    ...[...upper].map((letter) => letter.charCodeAt(0) + REGIONAL_INDICATOR_OFFSET),
  );
}

export function countryName(code: string, locale: string): string {
  const upper = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return code;
  try {
    return new Intl.DisplayNames([locale, "en"], { type: "region" }).of(upper) ?? upper;
  } catch {
    return upper;
  }
}

export function countryCurrency(code: string): string | null {
  return countryCurrencies[code.toUpperCase()] ?? null;
}

export function isKnownCountry(code: string): boolean {
  return Object.hasOwn(countryCurrencies, code.toUpperCase());
}

/** Список для выпадающих списков: отсортирован по названию на языке интерфейса. */
export function countryOptions(locale: string): CountryOption[] {
  const collator = new Intl.Collator(locale);
  return countryCodes
    .map((code) => ({
      code,
      name: countryName(code, locale),
      currency: countryCurrencies[code],
      flag: countryFlag(code),
    }))
    .sort((left, right) => collator.compare(left.name, right.name));
}

/**
 * Страна в профиле раньше была свободным текстом, поэтому старые значения
 * показываем как есть, а новые (код) переводим на язык интерфейса.
 */
export function countryLabel(value: string, locale: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return isKnownCountry(trimmed) ? countryName(trimmed, locale) : trimmed;
}
