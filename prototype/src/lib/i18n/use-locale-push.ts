"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { localizeHref } from "@/lib/i18n/locale-path";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

/**
 * Переход на другую страницу с языковым префиксом.
 * Нужен именно router.push: pushState меняет только адрес, контент остаётся прежним.
 * Префикс обязателен — иначе proxy редиректит и клиентский переход обрывается.
 */
export function useLocalePush(): (href: string) => void {
  const { locale } = useLocale();
  const router = useRouter();
  return useCallback(
    (href: string) => {
      router.push(localizeHref(href, locale));
    },
    [locale, router],
  );
}

/** Заранее подготавливает локализованный маршрут для мгновенного перехода. */
export function useLocalePrefetch(): (href: string) => void {
  const { locale } = useLocale();
  const router = useRouter();
  return useCallback(
    (href: string) => {
      router.prefetch(localizeHref(href, locale));
    },
    [locale, router],
  );
}

/** Переходы роутера с языковым префиксом в адресе */
export function useLocaleRouter(): {
  push: (href: string) => void;
  replace: (href: string) => void;
  refresh: () => void;
} {
  const { locale } = useLocale();
  const router = useRouter();
  return useMemo(
    () => ({
      push: (href: string) => router.push(localizeHref(href, locale)),
      replace: (href: string) => router.replace(localizeHref(href, locale)),
      refresh: () => router.refresh(),
    }),
    [locale, router],
  );
}
