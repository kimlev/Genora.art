import type { Locale } from "@/lib/i18n/types";

/**
 * Страна метода или провайдера задаёт язык интерфейса, на котором метод виден.
 * Пустой список стран — метод на весь мир, его показывают на любом языке.
 * Страна без языка на сайте скрывает метод, пока этот язык не появится.
 */
const COUNTRY_LOCALE: Record<string, Locale> = {
  RU: "ru", BY: "ru",
  US: "en", GB: "en", AU: "en", NZ: "en", IE: "en", CA: "en", ZA: "en", NG: "en",
  KE: "en", GH: "en", UG: "en", TZ: "en", ZM: "en", ZW: "en", BW: "en", MW: "en",
  JM: "en", BB: "en", BS: "en", BZ: "en", GY: "en", TT: "en", SG: "en", PH: "en",
  MT: "en", LR: "en", SL: "en",
  CN: "en", TW: "en", HK: "en", MO: "en",
  IN: "hi",
  ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es", EC: "es",
  GT: "es", CU: "es", BO: "es", DO: "es", HN: "es", PY: "es", SV: "es", NI: "es",
  CR: "es", PA: "es", UY: "es", PR: "es", GQ: "es",
  FR: "fr", MC: "fr", LU: "fr", SN: "fr", CI: "fr", ML: "fr", BF: "fr", NE: "fr",
  TG: "fr", BJ: "fr", GN: "fr", CD: "fr", CG: "fr", GA: "fr", CM: "fr", MG: "fr", HT: "fr",
  SA: "ar", AE: "ar", EG: "ar", IQ: "ar", JO: "ar", KW: "ar", LB: "ar", OM: "ar",
  QA: "ar", BH: "ar", YE: "ar", SY: "ar", LY: "ar", SD: "ar", MR: "ar", DZ: "ar",
  MA: "ar", TN: "ar", PS: "ar",
  PT: "pt", BR: "pt", AO: "pt", MZ: "pt", CV: "pt", GW: "pt", ST: "pt", TL: "pt",
  DE: "de", AT: "de", LI: "de", CH: "de",
  JP: "en",
  IT: "it", SM: "it", VA: "it",
  KR: "en", KP: "en",
  TR: "tr",
  PL: "pl",
  NL: "en", BE: "en", SR: "en",
  SE: "sv",
  CZ: "cs",
  GR: "en", CY: "en",
  RO: "en", MD: "ru",
};

export function localeOfCountry(countryCode: string): Locale | null {
  return COUNTRY_LOCALE[countryCode.trim().toUpperCase()] ?? null;
}

/** Страны метода, если заданы; иначе страны провайдера. Пусто — весь мир. */
export function effectiveMethodCountries(methodCountries: string[] | null | undefined, providerCountries: string[] | null | undefined): string[] {
  return methodCountries?.length ? methodCountries : providerCountries ?? [];
}

/** Страновой метод виден только на языке этой страны. */
export function methodVisibleForLocale(countryCodes: string[], locale: Locale): boolean {
  if (!countryCodes.length) return true;
  return countryCodes.some((code) => localeOfCountry(code) === locale);
}
