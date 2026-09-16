import "server-only";

import { normalizeStreampayPayUrl, parseStreampayMessages, signStreampayPayload, streampayCheckoutReturnUrls, streampayCreateBody, streampayExternalId } from "@/lib/payments/streampay";

export class StreampayCreateError extends Error {
  readonly reason: string;
  constructor(reason: string) {
    super("STREAMPAY_CREATE_FAILED");
    this.name = "StreampayCreateError";
    this.reason = reason.slice(0, 500);
  }
}

const DEFAULT_API = "https://api.streampay.org";
const STREAMPAY_LANGS = new Set(["ru", "en", "ua", "es", "az", "ar", "tr", "pt", "de", "fa"]);

export function streampayProviderId(): string {
  return process.env.STREAMPAY_PROVIDER_ID?.trim() || "streampay";
}

export function isStreampayConfigured(): boolean {
  return Boolean(
    process.env.STREAMPAY_STORE_ID?.trim()
    && process.env.STREAMPAY_PRIVATE_KEY?.trim()
    && process.env.STREAMPAY_PUBLIC_KEY?.trim(),
  );
}

export function isStreampayProvider(id: string): boolean {
  return id === streampayProviderId();
}

type CreatedPayment = { url: string; invoiceId: string };

function streampayLang(locale?: string): string {
  const code = (locale ?? "").toLowerCase();
  return STREAMPAY_LANGS.has(code) ? code : "ru";
}

/**
 * Создаёт счёт в выбранном режиме StreamPay: тип 1 — национальная валюта,
 * тип 2 — USD/USDT. Возвращает документированную платёжную ссылку провайдера.
 */
export async function createStreampayPayment(input: {
  customer: string;
  externalId: string;
  amount: number;
  currency?: string;
  locale?: string;
}): Promise<CreatedPayment> {
  const storeId = Number(process.env.STREAMPAY_STORE_ID);
  const privateKey = process.env.STREAMPAY_PRIVATE_KEY?.trim() ?? "";
  const apiBase = (process.env.STREAMPAY_API_BASE_URL?.trim() || DEFAULT_API).replace(/\/$/, "");
  const appBase = (process.env.APP_BASE_URL?.trim() || "https://genora.art").replace(/\/$/, "");
  if (!Number.isInteger(storeId) || storeId <= 0 || !privateKey) throw new Error("STREAMPAY_NOT_CONFIGURED");

  const externalId = streampayExternalId(input.externalId).slice(0, 128);
  const returns = streampayCheckoutReturnUrls(appBase, input.externalId);
  const body = JSON.stringify({
    ...streampayCreateBody({
      storeId,
      customer: input.customer.slice(0, 256),
      externalId,
      description: `Genora.art ${input.externalId}`.slice(0, 256),
      amount: input.amount,
      currency: input.currency,
    }),
    success_url: returns.success,
    fail_url: returns.fail,
    cancel_url: returns.cancel,
    lang: streampayLang(input.locale),
  });
  const response = await fetch(`${apiBase}/api/payment/create`, {
    method: "POST",
    headers: { "content-type": "application/json", signature: signStreampayPayload(body, privateKey) },
    body,
  });
  const payload = await response.json().catch(() => null) as {
    status?: number; data?: { url?: string; pay_url?: string; invoice?: string; invoice_id?: string };
    messages?: unknown; error?: unknown; message?: unknown;
  } | null;
  const rawUrl = payload?.data?.pay_url ?? payload?.data?.url ?? null;
  const invoiceId = payload?.data?.invoice ?? payload?.data?.invoice_id ?? "";
  const url = rawUrl ? normalizeStreampayPayUrl(rawUrl) : null;
  if (response.status !== 200 || !url) {
    const reason = parseStreampayMessages(payload) || `StreamPay HTTP ${response.status}`;
    console.error("streampay_create_failed", response.status, payload);
    throw new StreampayCreateError(reason);
  }
  return { url, invoiceId };
}
