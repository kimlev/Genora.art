import "server-only";

import { SITE_ORIGIN } from "@/lib/seo";
import { IS_STAGING } from "@/lib/site-env";
import { credential } from "@/lib/server/search-credentials";
import { createSign } from "node:crypto";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
/** Права нужны и на чтение отчётов, и на отправку карты сайта */
const SCOPE = "https://www.googleapis.com/auth/webmasters";
const API_ORIGIN = "https://searchconsole.googleapis.com/webmasters/v3";
const TIMEOUT_MS = 15_000;
const ROW_LIMIT = 15;

type ServiceAccount = { email: string; privateKey: string };

/** PEM с переводами строк не помещается в файл переменных, поэтому принимаем и `\n`, и base64 */
function readPrivateKey(raw: string): string | null {
  const value = raw.trim().replace(/\\n/g, "\n");
  if (value.includes("BEGIN")) return value;
  try {
    const decoded = Buffer.from(value, "base64").toString("utf8");
    return decoded.includes("BEGIN") ? decoded : null;
  } catch {
    return null;
  }
}

async function serviceAccount(): Promise<ServiceAccount | null> {
  const [email, rawKey] = await Promise.all([credential("google_client_email"), credential("google_private_key")]);
  if (!email || !rawKey) return null;
  const privateKey = readPrivateKey(rawKey);
  return privateKey ? { email, privateKey } : null;
}

/** Ресурс в Search Console: домен подтверждён целиком, поэтому адрес начинается с `sc-domain:` */
export async function searchConsoleSite(): Promise<string> {
  return (await credential("google_site")) || "sc-domain:genora.art";
}

export async function isSearchConsoleConfigured(): Promise<boolean> {
  return Boolean(await serviceAccount());
}

let cachedToken: { value: string; expiresAt: number } | null = null;

/**
 * Сервисный аккаунт подписывает запрос сам, поэтому вход человека в браузере не нужен.
 * Google выдаёт токен на час, и мы держим его в памяти процесса.
 */
async function accessToken(account: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const issuedAt = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claims = Buffer.from(JSON.stringify({
    iss: account.email,
    scope: SCOPE,
    aud: TOKEN_ENDPOINT,
    iat: issuedAt,
    exp: issuedAt + 3600,
  })).toString("base64url");
  const signature = createSign("RSA-SHA256")
    .update(`${header}.${claims}`)
    .sign(account.privateKey)
    .toString("base64url");

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Google не выдал токен: ${response.status}`);

  const payload = await response.json() as { access_token?: string; expires_in?: number };
  if (!payload.access_token) throw new Error("Google не выдал токен");
  cachedToken = { value: payload.access_token, expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000 };
  return cachedToken.value;
}

/**
 * Единственный способ сообщить Google о новой странице: своего приёмника адресов
 * для обычных страниц у него нет, Indexing API работает только для вакансий и трансляций.
 * Повторная отправка карты сайта заставляет Google перечитать её и увидеть новые адреса.
 */
export async function submitSitemapToGoogle(feedUrl = `${SITE_ORIGIN}/sitemap.xml`): Promise<void> {
  if (IS_STAGING) throw new Error("Отправка карты сайта в Google отключена на dev");
  const account = await serviceAccount();
  if (!account) throw new Error("Доступ к Search Console не настроен");
  const [token, site] = await Promise.all([accessToken(account), searchConsoleSite()]);
  const response = await fetch(
    `${API_ORIGIN}/sites/${encodeURIComponent(site)}/sitemaps/${encodeURIComponent(feedUrl)}`,
    {
      method: "PUT",
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );
  if (response.status === 403) throw new Error("Сервисному аккаунту не открыт доступ к ресурсу в Search Console");
  if (!response.ok) throw new Error(`Search Console ответил ${response.status}`);
}

export type SearchRow = { key: string; clicks: number; impressions: number; ctr: number; position: number };
export type SearchTotals = { clicks: number; impressions: number; ctr: number; position: number };
export type SearchConsoleReport = { site: string; totals: SearchTotals; queries: SearchRow[]; pages: SearchRow[] };

type ApiRow = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };

async function searchAnalytics(
  token: string,
  site: string,
  body: Record<string, unknown>,
): Promise<ApiRow[]> {
  const response = await fetch(
    `${API_ORIGIN}/sites/${encodeURIComponent(site)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );
  if (response.status === 403) throw new Error("Сервисному аккаунту не открыт доступ к ресурсу в Search Console");
  if (!response.ok) throw new Error(`Search Console ответил ${response.status}`);
  const payload = await response.json() as { rows?: ApiRow[] };
  return payload.rows ?? [];
}

function toRow(row: ApiRow): SearchRow {
  return {
    key: row.keys?.[0] ?? "—",
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  };
}

/** Отчёт Google за период. Данные приходят с задержкой в два-три дня — это поведение самого Google. */
export async function searchConsoleReport(from: string, to: string): Promise<SearchConsoleReport> {
  const account = await serviceAccount();
  if (!account) throw new Error("Доступ к Search Console не настроен");
  const [token, site] = await Promise.all([accessToken(account), searchConsoleSite()]);
  const range = { startDate: from, endDate: to, dataState: "all" };

  const [totalRows, queryRows, pageRows] = await Promise.all([
    searchAnalytics(token, site, range),
    searchAnalytics(token, site, { ...range, dimensions: ["query"], rowLimit: ROW_LIMIT }),
    searchAnalytics(token, site, { ...range, dimensions: ["page"], rowLimit: ROW_LIMIT }),
  ]);

  const totals = totalRows[0] ?? {};
  return {
    site,
    totals: {
      clicks: totals.clicks ?? 0,
      impressions: totals.impressions ?? 0,
      ctr: totals.ctr ?? 0,
      position: totals.position ?? 0,
    },
    queries: queryRows.map(toRow),
    pages: pageRows.map(toRow),
  };
}
