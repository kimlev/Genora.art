import "server-only";

import type { Locale } from "@/lib/i18n";
import { searchTargetsForLocale, type SearchTarget } from "@/lib/search-routing";
import { isIndexNowConfigured, submitToIndexNow } from "@/lib/server/indexnow";
import { isSearchConsoleConfigured, submitSitemapToGoogle } from "@/lib/server/search-console";
import { isYandexWebmasterConfigured, queueYandexRecrawl } from "@/lib/server/yandex-webmaster";

export type SubmitOutcome = {
  target: SearchTarget;
  channel: "indexnow" | "yandex-recrawl" | "google-sitemap";
  ok: boolean;
  detail: string;
};

async function attempt(
  target: SearchTarget,
  channel: SubmitOutcome["channel"],
  configured: boolean | Promise<boolean>,
  run: () => Promise<string>,
): Promise<SubmitOutcome> {
  if (!(await configured)) return { target, channel, ok: false, detail: "доступ не настроен" };
  try {
    return { target, channel, ok: true, detail: await run() };
  } catch (error) {
    return { target, channel, ok: false, detail: (error as Error).message };
  }
}

/**
 * Сообщает поисковикам о новой странице: Google получает адрес на любом языке,
 * Яндекс — только русский. Ошибки не прерывают публикацию статьи, а возвращаются вызывающему коду.
 */
export async function submitPageForIndexing(url: string, locale: Locale, extraUrls: string[] = []): Promise<SubmitOutcome[]> {
  const targets = searchTargetsForLocale(locale);
  const jobs: Array<Promise<SubmitOutcome>> = [];

  if (targets.includes("yandex")) {
    jobs.push(
      attempt("yandex", "indexnow", isIndexNowConfigured(), async () => {
        const result = await submitToIndexNow([url, ...extraUrls]);
        if (result.reason) throw new Error(result.reason);
        return `адресов отправлено: ${result.submitted}`;
      }),
      attempt("yandex", "yandex-recrawl", isYandexWebmasterConfigured(), async () => {
        const result = await queueYandexRecrawl(url);
        return `задача ${result.taskId}, остаток квоты ${result.quotaLeft}`;
      }),
    );
  }

  if (targets.includes("google")) {
    jobs.push(
      attempt("google", "google-sitemap", isSearchConsoleConfigured(), async () => {
        await submitSitemapToGoogle();
        return "карта сайта отправлена на повторное чтение";
      }),
    );
  }

  return await Promise.all(jobs);
}
