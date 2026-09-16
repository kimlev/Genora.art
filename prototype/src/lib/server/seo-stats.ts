import "server-only";

import { INDEXNOW_KEY_PATH } from "@/lib/indexnow";
import { SITE_ORIGIN } from "@/lib/seo";
import { isIndexNowConfigured } from "@/lib/server/indexnow";
import {
  isSearchConsoleConfigured,
  searchConsoleReport,
  searchConsoleSite,
  type SearchConsoleReport,
} from "@/lib/server/search-console";
import {
  isYandexWebmasterConfigured,
  yandexWebmasterReport,
  type YandexReport,
} from "@/lib/server/yandex-webmaster";

/** Каждый источник отвечает сам за себя: недоступный Яндекс не должен прятать данные Google */
export type SeoSource<T> = { configured: boolean; data: T | null; error: string | null };

export type SeoStats = {
  period: { from: string; to: string };
  updatedAt: string;
  google: SeoSource<SearchConsoleReport> & { site: string };
  yandex: SeoSource<YandexReport>;
  indexNow: { configured: boolean; keyUrl: string };
};

/** Обе системы отдают данные с задержкой в сутки и ограничивают частоту запросов */
const CACHE_TTL_MS = 10 * 60_000;
const cache = new Map<string, { at: number; value: SeoStats }>();

async function collect<T>(
  configured: boolean | Promise<boolean>,
  label: string,
  load: () => Promise<T>,
): Promise<SeoSource<T>> {
  if (!(await configured)) return { configured: false, data: null, error: null };
  try {
    return { configured: true, data: await load(), error: null };
  } catch (error) {
    console.error(`seo_stats_failed_${label}`, error);
    return { configured: true, data: null, error: (error as Error).message };
  }
}

export async function seoStats(from: string, to: string, refresh = false): Promise<SeoStats> {
  const key = `${from}:${to}`;
  const cached = cache.get(key);
  if (!refresh && cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  const [google, yandex] = await Promise.all([
    collect(isSearchConsoleConfigured(), "google", () => searchConsoleReport(from, to)),
    collect(isYandexWebmasterConfigured(), "yandex", () => yandexWebmasterReport(from, to)),
  ]);

  const value: SeoStats = {
    period: { from, to },
    updatedAt: new Date().toISOString(),
    google: { ...google, site: await searchConsoleSite() },
    yandex,
    indexNow: { configured: isIndexNowConfigured(), keyUrl: `${SITE_ORIGIN}${INDEXNOW_KEY_PATH}` },
  };

  for (const [entryKey, entry] of cache) {
    if (Date.now() - entry.at > CACHE_TTL_MS) cache.delete(entryKey);
  }
  cache.set(key, { at: Date.now(), value });
  return value;
}
