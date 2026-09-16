import { isServedLocale, SERVED_LOCALE_CODES } from "./i18n/served-locales";
import type { Locale } from "./i18n/types";

export type { Locale };

const LOCALES: readonly Locale[] = SERVED_LOCALE_CODES;

export const defaultRequestLocale: Locale = "ru";

export function isRequestLocale(value: string): value is Locale {
  return isServedLocale(value);
}

export function parseAcceptLanguage(header?: string | null): Locale | null {
  if (!header?.trim()) return null;
  const ranked = header.split(",").map((part) => {
    const [tag, ...params] = part.trim().split(";");
    const quality = params.find((param) => param.trim().startsWith("q="));
    return { tag: tag.trim().toLowerCase(), q: quality ? Number(quality.split("=")[1]) || 0 : 1 };
  }).filter((part) => part.tag).sort((left, right) => right.q - left.q);

  for (const { tag } of ranked) {
    if (isRequestLocale(tag)) return tag;
    const short = tag.slice(0, 2);
    if (isRequestLocale(short)) return short;
  }
  return null;
}

export function resolveRequestLocale(input: {
  explicit?: string | null;
  cookie?: string | null;
  appHeader?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  if (input.explicit && isRequestLocale(input.explicit)) return input.explicit;
  if (input.appHeader && isRequestLocale(input.appHeader)) return input.appHeader;
  if (input.cookie && isRequestLocale(input.cookie)) return input.cookie;
  return parseAcceptLanguage(input.acceptLanguage) ?? defaultRequestLocale;
}
