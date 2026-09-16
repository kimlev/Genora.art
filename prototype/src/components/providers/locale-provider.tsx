"use client";

import {
  defaultLocale,
  getDictionary,
  getLocaleOption,
  LOCALE_STORAGE_KEY,
  type Dictionary,
  type Locale,
} from "@/lib/i18n";
import { isUnlocalizedPath, splitLocalePath, withLocalePath } from "@/lib/i18n/locale-path";
import { LOCALE_COOKIE, LOCALE_QUERY } from "@/lib/seo";
import { cookiePath } from "@/lib/site-env";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

function writeLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=${cookiePath()}; max-age=31536000; samesite=lax`;
}

function applyDocumentLocale(locale: Locale) {
  const option = getLocaleOption(locale);
  const direction = option.rtl ? "rtl" : "ltr";
  document.documentElement.lang = option.code;
  document.documentElement.dir = direction;
  document.documentElement.style.direction = direction;
  document.body.dir = direction;
  document.body.style.direction = direction;
}

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dictionary: Dictionary;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

type LocaleProviderProps = {
  children: ReactNode;
  initialLocale?: Locale;
};

/**
 * Язык страницы определяет адрес: `/en/chat` — это всегда английская версия.
 * Разделы без языка в адресе (админка) используют язык, определённый сервером.
 */
export function LocaleProvider({ children, initialLocale = defaultLocale }: LocaleProviderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = splitLocalePath(pathname).locale ?? initialLocale;

  useEffect(() => {
    applyDocumentLocale(locale);
    writeLocaleCookie(locale);
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      writeLocaleCookie(next);
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
      void fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: next }),
      }).catch(() => undefined);

      const url = new URL(window.location.href);
      if (isUnlocalizedPath(url.pathname)) return;
      url.searchParams.delete(LOCALE_QUERY);
      router.replace(`${withLocalePath(url.pathname, next)}${url.search}${url.hash}`);
    },
    [router],
  );

  const dictionary = useMemo(() => getDictionary(locale), [locale]);

  const value = useMemo(() => ({ locale, setLocale, dictionary }), [dictionary, locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return context;
}

export function useT(): Dictionary {
  return useLocale().dictionary;
}
