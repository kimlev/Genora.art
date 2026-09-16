import { SITE_ORIGIN } from "@/lib/seo";

/** Адрес, по которому поисковики скачивают ключ и убеждаются, что запрос пришёл от владельца сайта */
export const INDEXNOW_KEY_PATH = "/indexnow-key.txt";

/** Приёмник принимает ключ только из латиницы, цифр и дефисов */
const KEY_PATTERN = /^[a-zA-Z0-9-]{8,128}$/;
const MAX_URLS = 10_000;

export function isIndexNowKey(value: string | null | undefined): boolean {
  return typeof value === "string" && KEY_PATTERN.test(value);
}

/**
 * Оставляет только адреса своего сайта без повторов.
 * Чужой домен в списке приводит к отказу всего пакета, поэтому такие адреса отбрасываем заранее.
 */
export function ownSiteUrls(urls: string[]): string[] {
  const unique = new Set<string>();
  for (const value of urls) {
    // Произвольный текст тоже разрешается в адрес относительно домена, поэтому пускаем дальше только явные адреса
    if (!/^(https?:\/\/|\/)/.test(value)) continue;
    let url: URL;
    try {
      url = new URL(value, SITE_ORIGIN);
    } catch {
      continue;
    }
    if (url.origin !== SITE_ORIGIN) continue;
    url.hash = "";
    unique.add(url.toString());
  }
  return [...unique].slice(0, MAX_URLS);
}

export type IndexNowPayload = { host: string; key: string; keyLocation: string; urlList: string[] };

export function indexNowPayload(key: string, urls: string[]): IndexNowPayload {
  return {
    host: new URL(SITE_ORIGIN).host,
    key,
    keyLocation: `${SITE_ORIGIN}${INDEXNOW_KEY_PATH}`,
    urlList: ownSiteUrls(urls),
  };
}
