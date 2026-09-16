import "server-only";

import { query } from "@/lib/server/db";

/**
 * Доступы к Яндекс Вебмастеру и Search Console хранятся в базе: токен Яндекса живёт
 * полгода и обновляется сам, поэтому значение должно переживать перезапуск контейнера.
 * Переменные окружения остаются запасным вариантом — на них работает локальная разработка.
 */
export type CredentialName =
  | "yandex_access_token"
  | "yandex_refresh_token"
  | "yandex_expires_at"
  | "yandex_client_id"
  | "yandex_client_secret"
  | "yandex_host_id"
  | "google_client_email"
  | "google_private_key"
  | "google_site";

const ENV_FALLBACK: Partial<Record<CredentialName, string>> = {
  yandex_access_token: "YANDEX_WEBMASTER_TOKEN",
  yandex_host_id: "YANDEX_WEBMASTER_HOST_ID",
  google_client_email: "GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL",
  google_private_key: "GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY",
  google_site: "GOOGLE_SEARCH_CONSOLE_SITE",
};

const CACHE_MS = 60_000;

let cache: { values: Map<string, string>; readAt: number } | null = null;

async function stored(): Promise<Map<string, string>> {
  if (cache && Date.now() - cache.readAt < CACHE_MS) return cache.values;
  try {
    const rows = await query<{ name: string; value: string }>("SELECT name, value FROM search_credentials");
    cache = { values: new Map(rows.map((row) => [row.name, row.value])), readAt: Date.now() };
  } catch (error) {
    // База может быть недоступна при сборке образа или до применения миграции
    console.error("search_credentials_read_failed", (error as Error).message);
    cache = { values: new Map(), readAt: Date.now() };
  }
  return cache.values;
}

export async function credential(name: CredentialName): Promise<string | null> {
  const value = (await stored()).get(name)?.trim();
  if (value) return value;
  const envName = ENV_FALLBACK[name];
  return (envName && process.env[envName]?.trim()) || null;
}

export async function saveCredentials(values: Partial<Record<CredentialName, string>>): Promise<void> {
  const entries = Object.entries(values).filter(([, value]) => typeof value === "string" && value.trim());
  if (!entries.length) return;
  for (const [name, value] of entries) {
    await query(
      `INSERT INTO search_credentials(name, value) VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET value = excluded.value, updated_at = now()`,
      [name, (value as string).trim()],
    );
  }
  cache = null;
}
