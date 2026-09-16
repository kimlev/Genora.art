import { isRetiredLocale } from "@/lib/i18n/served-locales";
import { isRequestLocale, type Locale } from "@/lib/locale-from-request";

/** Разделы, которые живут без языкового префикса: API, админка, внешние интеграции */
const UNLOCALIZED_SEGMENTS = ["api", "admin", "blogoro", "_next", "favicon"];

export function isUnlocalizedPath(pathname: string): boolean {
  const segment = pathname.split("/")[1] ?? "";
  return UNLOCALIZED_SEGMENTS.includes(segment);
}

/** Отделяет языковой префикс от остального пути: `/en/chat` → `{ locale: "en", path: "/chat" }` */
export function splitLocalePath(pathname: string): { locale: Locale | null; path: string } {
  const segments = pathname.split("/");
  const head = segments[1] ?? "";
  if (!isRequestLocale(head)) return { locale: null, path: normalizePath(pathname) };
  return { locale: head, path: normalizePath(`/${segments.slice(2).join("/")}`) };
}

/** Старый языковой префикс, который больше не обслуживаем: `/zh/chat` → `{ path: "/chat" }` */
export function splitRetiredLocalePath(pathname: string): { path: string } | null {
  const segments = pathname.split("/");
  const head = segments[1] ?? "";
  if (!isRetiredLocale(head)) return null;
  return { path: normalizePath(`/${segments.slice(2).join("/")}`) };
}

/** Возвращает путь с нужным языковым префиксом, заменяя уже существующий */
export function withLocalePath(pathname: string, locale: Locale): string {
  const { path } = splitLocalePath(pathname);
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/**
 * Адрес внутри сайта с языковым префиксом, вместе с параметрами и якорем.
 * Внешние ссылки, якоря и разделы без языка возвращаются без изменений.
 */
export function localizeHref(href: string, locale: Locale): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const boundary = href.search(/[?#]/);
  const path = boundary === -1 ? href : href.slice(0, boundary);
  const rest = boundary === -1 ? "" : href.slice(boundary);
  if (isUnlocalizedPath(path) || splitLocalePath(path).locale) return href;
  return `${withLocalePath(path, locale)}${rest}`;
}

function normalizePath(pathname: string): string {
  if (!pathname.startsWith("/")) return `/${pathname}`;
  const trimmed = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return trimmed === "" ? "/" : trimmed;
}
