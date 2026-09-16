import { legalTextLocale } from "@/lib/legal/documents";
import { resolveRequestLocale, type Locale } from "@/lib/locale-from-request";
import { LOCALE_COOKIE, LOCALE_HEADER, publicPageMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";

export { legalTextLocale };

export async function requestLocale(lang?: string | string[] | null): Promise<Locale> {
  const headersList = await headers();
  const cookieStore = await cookies();
  return resolveRequestLocale({
    explicit: Array.isArray(lang) ? lang[0] : lang,
    appHeader: headersList.get(LOCALE_HEADER),
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headersList.get("accept-language"),
  });
}

/** Метаданные публичной страницы на языке текущего адреса */
export async function requestPageMetadata(path: string): Promise<Metadata> {
  return publicPageMetadata(path, await requestLocale());
}
