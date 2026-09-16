import "server-only";

import { indexNowPayload, isIndexNowKey } from "@/lib/indexnow";

/** Общая точка приёма IndexNow: она раздаёт адреса всем участникам протокола, включая Яндекс и Bing */
const ENDPOINT = "https://api.indexnow.org/indexnow";
const TIMEOUT_MS = 5000;

export function indexNowKey(): string | null {
  const value = process.env.INDEXNOW_KEY?.trim();
  return value && isIndexNowKey(value) ? value : null;
}

export function isIndexNowConfigured(): boolean {
  return Boolean(indexNowKey());
}

export type IndexNowResult = {
  submitted: number;
  status: number | null;
  reason?: "not-configured" | "no-urls" | "rejected" | "request-failed";
};

/**
 * Сообщает поисковикам о новых и обновлённых страницах.
 * Google этот протокол не поддерживает и узнаёт о страницах из карты сайта.
 */
export async function submitToIndexNow(urls: string[]): Promise<IndexNowResult> {
  const key = indexNowKey();
  if (!key) return { submitted: 0, status: null, reason: "not-configured" };

  const payload = indexNowPayload(key, urls);
  if (!payload.urlList.length) return { submitted: 0, status: null, reason: "no-urls" };

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error("indexnow_rejected", { status: response.status, urls: payload.urlList.length });
      return { submitted: 0, status: response.status, reason: "rejected" };
    }
    return { submitted: payload.urlList.length, status: response.status };
  } catch (error) {
    console.error("indexnow_request_failed", error);
    return { submitted: 0, status: null, reason: "request-failed" };
  }
}
