import { isUnlocalizedPath, splitLocalePath, splitRetiredLocalePath, withLocalePath } from "@/lib/i18n/locale-path";
import {
  defaultRequestLocale,
  isRequestLocale,
  parseAcceptLanguage,
  type Locale,
} from "@/lib/locale-from-request";
import { LOCALE_COOKIE, LOCALE_HEADER, LOCALE_QUERY } from "@/lib/seo";
import { cookiePath } from "@/lib/site-env";
import { NextResponse, type NextRequest } from "next/server";

const LOCALE_COOKIE_OPTIONS = {
  path: cookiePath(),
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax",
} as const;

function localeHeaders(request: NextRequest, locale: Locale): Headers {
  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, locale);
  return headers;
}

/** Язык для адреса без префикса: явный `?lang`, затем выбор пользователя, затем язык браузера */
function preferredLocale(request: NextRequest): Locale {
  const fromQuery = request.nextUrl.searchParams.get(LOCALE_QUERY);
  if (fromQuery && isRequestLocale(fromQuery)) return fromQuery;
  const fromCookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (fromCookie && isRequestLocale(fromCookie)) return fromCookie;
  return parseAcceptLanguage(request.headers.get("accept-language")) ?? defaultRequestLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API, админка и внешние интеграции живут без языка в адресе
  if (isUnlocalizedPath(pathname)) {
    return NextResponse.next({ request: { headers: localeHeaders(request, preferredLocale(request)) } });
  }

  const retired = splitRetiredLocalePath(pathname);
  if (retired) {
    const locale = preferredLocale(request);
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = withLocalePath(retired.path, locale);
    const redirect = NextResponse.redirect(redirectUrl, 308);
    redirect.cookies.set(LOCALE_COOKIE, locale, LOCALE_COOKIE_OPTIONS);
    return redirect;
  }

  const { locale: pathLocale, path } = splitLocalePath(pathname);

  // Язык уже в адресе: страница такая и есть в приложении, подменять путь не нужно
  if (pathLocale) {
    const requested = request.nextUrl.searchParams.get(LOCALE_QUERY);

    // Явный `?lang` перекрывает префикс: уводим на постоянный адрес нужного языка
    if (requested && isRequestLocale(requested) && requested !== pathLocale) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = withLocalePath(path, requested);
      redirectUrl.searchParams.delete(LOCALE_QUERY);
      const redirect = NextResponse.redirect(redirectUrl, 307);
      redirect.cookies.set(LOCALE_COOKIE, requested, LOCALE_COOKIE_OPTIONS);
      return redirect;
    }

    const response = NextResponse.next({ request: { headers: localeHeaders(request, pathLocale) } });
    response.cookies.set(LOCALE_COOKIE, pathLocale, LOCALE_COOKIE_OPTIONS);
    return response;
  }

  const locale = preferredLocale(request);
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = withLocalePath(pathname, locale);
  redirectUrl.searchParams.delete(LOCALE_QUERY);
  const response = NextResponse.redirect(redirectUrl, 307);
  response.headers.set("vary", "accept-language, cookie");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/|blogoro/|favicon|.*\\..*).*)"],
};
