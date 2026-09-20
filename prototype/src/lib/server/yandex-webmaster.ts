import "server-only";

import { SITE_ORIGIN } from "@/lib/seo";
import { IS_STAGING } from "@/lib/site-env";
import { credential, saveCredentials } from "@/lib/server/search-credentials";

const API_ORIGIN = "https://api.webmaster.yandex.net/v4";
const OAUTH_ENDPOINT = "https://oauth.yandex.ru/token";
const TIMEOUT_MS = 15_000;
const ROW_LIMIT = 15;
/** Яндекс выдаёт токен на полгода: меняем его заранее, чтобы публикация статьи не наткнулась на просроченный */
const RENEW_BEFORE_MS = 7 * 24 * 60 * 60 * 1000;

/** Обменивает refresh-токен на новый доступ и сохраняет его в базе */
async function renewToken(refreshToken: string, clientId: string, clientSecret: string): Promise<string> {
  const response = await fetch(OAUTH_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const payload = await response.json().catch(() => null) as
    | { access_token?: string; refresh_token?: string; expires_in?: number }
    | null;
  if (!response.ok || !payload?.access_token) throw new Error(`Яндекс не обновил токен: ${response.status}`);

  await saveCredentials({
    yandex_access_token: payload.access_token,
    yandex_refresh_token: payload.refresh_token ?? refreshToken,
    yandex_expires_at: String(Date.now() + (payload.expires_in ?? 0) * 1000),
  });
  return payload.access_token;
}

async function token(): Promise<string | null> {
  const current = await credential("yandex_access_token");
  const expiresAt = Number(await credential("yandex_expires_at")) || 0;
  const fresh = !expiresAt || expiresAt - Date.now() > RENEW_BEFORE_MS;
  if (current && fresh) return current;

  const [refreshToken, clientId, clientSecret] = await Promise.all([
    credential("yandex_refresh_token"),
    credential("yandex_client_id"),
    credential("yandex_client_secret"),
  ]);
  if (!refreshToken || !clientId || !clientSecret) return current;

  try {
    return await renewToken(refreshToken, clientId, clientSecret);
  } catch (error) {
    console.error("yandex_token_renew_failed", (error as Error).message);
    return current;
  }
}

export async function isYandexWebmasterConfigured(): Promise<boolean> {
  return Boolean(await token());
}

async function request<T>(path: string, search?: URLSearchParams, body?: unknown): Promise<T> {
  const accessToken = await token();
  if (!accessToken) throw new Error("Доступ к Яндекс Вебмастеру не настроен");
  const url = `${API_ORIGIN}${path}${search ? `?${search}` : ""}`;
  const response = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      authorization: `OAuth ${accessToken}`,
      accept: "application/json",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (response.status === 401 || response.status === 403) {
    throw new Error("Яндекс отклонил токен: проверьте срок действия и права приложения");
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error_code?: string; error_message?: string } | null;
    throw new Error(payload?.error_code
      ? `Яндекс Вебмастер: ${payload.error_code}`
      : `Яндекс Вебмастер ответил ${response.status}`);
  }
  return await response.json() as T;
}

/** ID владельца токена и ID сайта Яндекс выдаёт отдельными запросами, поэтому держим их в памяти процесса */
let cachedHost: { userId: number; hostId: string } | null = null;

async function resolveHost(): Promise<{ userId: number; hostId: string }> {
  if (cachedHost) return cachedHost;
  const user = await request<{ user_id?: number }>("/user/");
  if (!user.user_id) throw new Error("Яндекс не вернул идентификатор пользователя");

  const configured = await credential("yandex_host_id");
  if (configured) {
    cachedHost = { userId: user.user_id, hostId: configured };
    return cachedHost;
  }

  const { hosts = [] } = await request<{
    hosts?: Array<{ host_id: string; ascii_host_url?: string; verified?: boolean }>;
  }>(`/user/${user.user_id}/hosts/`);
  const wanted = new URL(SITE_ORIGIN).hostname;
  const match = hosts.find((host) => {
    try {
      return new URL(host.ascii_host_url ?? "").hostname === wanted;
    } catch {
      return false;
    }
  });
  if (!match) throw new Error(`Сайт ${wanted} не найден среди сайтов этого аккаунта`);
  cachedHost = { userId: user.user_id, hostId: match.host_id };
  return cachedHost;
}

/**
 * Ставит страницу в очередь на переобход. Суточная квота ограничена,
 * поэтому исчерпание квоты — обычная ситуация, а не сбой.
 */
export async function queueYandexRecrawl(url: string): Promise<{ taskId: string; quotaLeft: number }> {
  if (IS_STAGING) throw new Error("Отправка страниц в Яндекс отключена на dev");
  const { userId, hostId } = await resolveHost();
  const result = await request<{ task_id?: string; quota_remainder?: number }>(
    `/user/${userId}/hosts/${encodeURIComponent(hostId)}/recrawl/queue/`,
    undefined,
    { url },
  );
  return { taskId: result.task_id ?? "", quotaLeft: result.quota_remainder ?? 0 };
}

export async function yandexRecrawlQuota(): Promise<{ daily: number; left: number }> {
  const { userId, hostId } = await resolveHost();
  const result = await request<{ daily_quota?: number; quota_remainder?: number }>(
    `/user/${userId}/hosts/${encodeURIComponent(hostId)}/recrawl/quota/`,
  );
  return { daily: result.daily_quota ?? 0, left: result.quota_remainder ?? 0 };
}

export type YandexQueryRow = { key: string; shows: number; clicks: number };
export type YandexReport = {
  hostId: string;
  sqi: number | null;
  searchablePages: number;
  excludedPages: number;
  problems: Record<string, number>;
  totals: { shows: number; clicks: number };
  queries: YandexQueryRow[];
};

type Indicators = { TOTAL_SHOWS?: number; TOTAL_CLICKS?: number };
type HistoryPoint = { date?: string; value?: number };

function sum(points: HistoryPoint[] | undefined): number {
  return (points ?? []).reduce((total, point) => total + (point.value ?? 0), 0);
}

/**
 * Сводка Яндекса за период: индексация, показы и клики, самые частые запросы.
 * Данные по запросам Яндекс хранит примерно за последний год и обновляет с задержкой в сутки.
 */
export async function yandexWebmasterReport(from: string, to: string): Promise<YandexReport> {
  const { userId, hostId } = await resolveHost();
  const base = `/user/${userId}/hosts/${encodeURIComponent(hostId)}`;
  const period = new URLSearchParams({ date_from: from, date_to: to });
  const indicators = new URLSearchParams(period);
  indicators.append("query_indicator", "TOTAL_SHOWS");
  indicators.append("query_indicator", "TOTAL_CLICKS");
  const popular = new URLSearchParams(indicators);
  popular.set("order_by", "TOTAL_SHOWS");
  popular.set("limit", String(ROW_LIMIT));

  const [summary, history, queries] = await Promise.all([
    request<{
      sqi?: number;
      searchable_pages_count?: number;
      excluded_pages_count?: number;
      site_problems?: Record<string, number>;
    }>(`${base}/summary/`),
    request<{ indicators?: Record<string, HistoryPoint[]> }>(`${base}/search-queries/all/history/`, indicators),
    request<{ queries?: Array<{ query_text?: string; indicators?: Indicators }> }>(
      `${base}/search-queries/popular/`,
      popular,
    ),
  ]);

  return {
    hostId,
    sqi: summary.sqi ?? null,
    searchablePages: summary.searchable_pages_count ?? 0,
    excludedPages: summary.excluded_pages_count ?? 0,
    problems: summary.site_problems ?? {},
    totals: {
      shows: sum(history.indicators?.TOTAL_SHOWS),
      clicks: sum(history.indicators?.TOTAL_CLICKS),
    },
    queries: (queries.queries ?? []).map((row) => ({
      key: row.query_text ?? "—",
      shows: row.indicators?.TOTAL_SHOWS ?? 0,
      clicks: row.indicators?.TOTAL_CLICKS ?? 0,
    })),
  };
}
