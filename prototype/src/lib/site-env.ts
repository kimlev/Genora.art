/** Копия для проверки: отдельный хост dev.genora.art, собирается с NEXT_PUBLIC_STAGING=1. */

export const SITE_ORIGIN = (process.env.NEXT_PUBLIC_APP_ORIGIN ?? "https://genora.art").replace(/\/$/, "");
export const IS_STAGING = process.env.NEXT_PUBLIC_STAGING === "1";

export function cookiePath(): string {
  return process.env.COOKIE_PATH?.trim() || "/";
}

export function sessionCookieName(): string {
  return process.env.SESSION_COOKIE_NAME?.trim() || (IS_STAGING ? "genora_dev_session" : "genora_session");
}

export function adminCookieName(): string {
  return process.env.ADMIN_COOKIE_NAME?.trim() || (IS_STAGING ? "genora_dev_admin" : "genora_admin");
}

export function localeCookieName(): string {
  return IS_STAGING ? "genora-dev-locale" : "genora-locale";
}

export function publicSiteUrl(path = "/"): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_ORIGIN}${suffix}`;
}
