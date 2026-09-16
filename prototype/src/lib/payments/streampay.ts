import { createPrivateKey, createPublicKey, sign, verify, type KeyObject } from "node:crypto";

/** PKCS8 DER prefix for an Ed25519 seed, as in the StreamPay cabinet examples. */
const PKCS8_PREFIX = "302e020100300506032b657004220420";
/** SPKI DER prefix for an Ed25519 public key. */
const SPKI_PREFIX = "302a300506032b6570032100";

export const STREAMPAY_SUCCESS = "success";
export const STREAMPAY_CANCELLED = new Set(["cancel", "overdue"]);
export const STREAMPAY_FAILED = new Set(["fail", "failed", "error", "reject", "rejected", "declined"]);
/** Документированный хост платёжной страницы StreamPay. */
export const STREAMPAY_CHECKOUT_HOST = "pay.streampay.org";
/** API также может вернуть устаревший адрес — принимаем его только как источник ID счёта. */
export const STREAMPAY_CHECKOUT_SOURCE_HOSTS = new Set(["pay.strpay.online", STREAMPAY_CHECKOUT_HOST]);

/** Валюта кошелька StreamPay: полученные USDT учитываем как USD один к одному. */
export function streampaySystemCurrency(value?: string): "USDT" {
  void value;
  return "USDT";
}

/**
 * Контракт конструктора StreamPay:
 * - тип 2 — сумма счёта в системной валюте USDT;
 * - тип 1 — сумма в валюте платежа, код передаётся отдельным полем `currency`.
 * При любом типе расчётный кошелёк мерчанта остаётся в USDT.
 */
export function streampayCreateCurrencies(chargeCurrency = "USD", settlement = "USDT"): {
  paymentType: 1 | 2;
  systemCurrency: "USDT";
  currency?: string;
} {
  const charge = chargeCurrency.trim().toUpperCase() || "USD";
  const systemCurrency = streampaySystemCurrency(settlement);
  if (charge === "USD" || charge === "USDT") return { paymentType: 2, systemCurrency };
  return { paymentType: 1, systemCurrency, currency: charge };
}

/** Тело `create` ровно в форме, которую генерирует конструктор StreamPay. */
export function streampayCreateBody(input: {
  storeId: number;
  customer: string;
  externalId: string;
  description: string;
  amount: number;
  currency?: string;
}): {
  store_id: number;
  customer: string;
  external_id: string;
  description: string;
  system_currency: "USDT";
  payment_type: 1 | 2;
  currency?: string;
  amount: number;
} {
  const currencies = streampayCreateCurrencies(input.currency);
  return {
    store_id: input.storeId,
    customer: input.customer,
    external_id: input.externalId,
    description: input.description,
    system_currency: currencies.systemCurrency,
    payment_type: currencies.paymentType,
    ...(currencies.currency ? { currency: currencies.currency } : {}),
    amount: input.amount,
  };
}

/** Внутри Genora.art USDT учитывается как USD по курсу 1:1. */
export function streampayAccountingCurrency(value?: string | null): string {
  const currency = value?.trim().toUpperCase() || "USD";
  return currency === "USDT" ? "USD" : currency;
}

/** StreamPay обрезает `MS-000002` по дефису и видит только `MS`. */
export function streampayExternalId(invoiceNumber: string): string {
  return invoiceNumber.replace(/-/g, "");
}

export type StreampayReturnPayment = "success" | "failed" | "cancelled";

/** Браузерный возврат: наш `payment=` или статус из query StreamPay. */
export function streampayReturnPayment(input: { payment?: string | null; status?: string | null }): StreampayReturnPayment | null {
  if (input.payment === "success" || input.payment === "failed" || input.payment === "cancelled") return input.payment;
  if (!input.status) return null;
  const outcome = streampayInvoiceOutcome(input.status);
  if (outcome === "paid") return "success";
  if (outcome === "cancelled" || outcome === "failed") return outcome;
  return null;
}

/** Номер нашего счёта: `MS-000004`, а не UUID StreamPay в поле `invoice`. */
export function streampayReturnInvoice(input: { invoice?: string | null; external_id?: string | null }): string {
  const invoice = input.invoice?.trim() ?? "";
  const externalId = input.external_id?.trim() ?? "";
  if (/^MS-?\d+/i.test(invoice)) return invoice;
  return externalId || invoice;
}

/** success/fail/cancel ведём на API без языка — страница сама не принимает POST от StreamPay. */
export function streampayCheckoutReturnUrls(appBase: string, invoiceNumber: string): {
  success: string; fail: string; cancel: string;
} {
  const root = `${appBase.replace(/\/$/, "")}/api/payments/streampay/return`;
  const link = (payment: StreampayReturnPayment) =>
    `${root}?payment=${payment}&invoice=${encodeURIComponent(invoiceNumber)}`;
  return { success: link("success"), fail: link("failed"), cancel: link("cancelled") };
}

/** В админке показываем `01a0249f`, копируется весь UUID. */
export function shortProviderInvoiceId(id: string): string {
  const trimmed = id.trim();
  return trimmed.split("-")[0] || trimmed.slice(0, 8);
}

export type StreamPayCallback = {
  externalId: string;
  invoiceId: string;
  amount: number | null;
  merchantTotal: number | null;
  currency: string | null;
  systemCurrency: string | null;
  status: string;
  errorMessage: string | null;
};

export type StreampayInvoiceOutcome = "paid" | "cancelled" | "failed" | "pending";

export function streampayInvoiceOutcome(status: string): StreampayInvoiceOutcome {
  if (status === STREAMPAY_SUCCESS) return "paid";
  if (STREAMPAY_CANCELLED.has(status)) return "cancelled";
  if (STREAMPAY_FAILED.has(status)) return "failed";
  return "pending";
}

/** Тексты ошибок StreamPay: `messages`, `error`, `message`, `fail_reason`. */
export function parseStreampayMessages(input: Record<string, unknown> | null | undefined): string | null {
  if (!input) return null;
  const chunks: string[] = [];
  const add = (value: unknown) => {
    if (typeof value === "string" && value.trim()) chunks.push(value.trim());
  };
  if (Array.isArray(input.messages)) input.messages.forEach(add);
  else add(input.messages);
  add(input.error);
  add(input.message);
  add(input.fail_reason);
  add(input.reason);
  return chunks.length ? chunks.join("; ").slice(0, 500) : null;
}

/** Проверяет ответ API и собирает документированный `pay_url` StreamPay. */
export function normalizeStreampayPayUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    if (!STREAMPAY_CHECKOUT_SOURCE_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    const invoiceId = parsed.searchParams.get("id")?.trim() || parsed.searchParams.get("invoice")?.trim();
    if (!invoiceId) return null;
    return `https://${STREAMPAY_CHECKOUT_HOST}/?id=${encodeURIComponent(invoiceId)}`;
  } catch {
    return null;
  }
}

/** UTC stamp `YYYYMMDD:HHMM` that StreamPay appends to the signed payload. */
export function streampayUtcStamp(date = new Date()): string {
  const year = date.getUTCFullYear().toString().padStart(4, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  const hour = date.getUTCHours().toString().padStart(2, "0");
  const minute = date.getUTCMinutes().toString().padStart(2, "0");
  return `${year}${month}${day}:${hour}${minute}`;
}

export function streampayPrivateKey(hex: string): KeyObject {
  const seed = hex.trim().replace(/^0x/i, "").slice(0, 64);
  if (!/^[0-9a-f]{64}$/i.test(seed)) throw new Error("STREAMPAY_PRIVATE_KEY");
  return createPrivateKey({ key: Buffer.from(`${PKCS8_PREFIX}${seed}`, "hex"), format: "der", type: "pkcs8" });
}

export function streampayPublicKey(hex: string): KeyObject {
  const body = hex.trim().replace(/^0x/i, "");
  if (!/^[0-9a-f]{64}$/i.test(body)) throw new Error("STREAMPAY_PUBLIC_KEY");
  return createPublicKey({ key: Buffer.from(`${SPKI_PREFIX}${body}`, "hex"), format: "der", type: "spki" });
}

export function signStreampayPayload(payload: string, privateKeyHex: string, at = new Date()): string {
  return sign(null, Buffer.from(`${payload}${streampayUtcStamp(at)}`), streampayPrivateKey(privateKeyHex)).toString("hex");
}

/** Accepts the current UTC minute and the previous one — StreamPay does the same. */
export function verifyStreampayPayload(payload: string, signatureHex: string, publicKeyHex: string, at = new Date()): boolean {
  const hex = signatureHex.trim();
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) return false;
  let key: KeyObject;
  try { key = streampayPublicKey(publicKeyHex); } catch { return false; }
  const signature = Buffer.from(hex, "hex");
  const now = new Date(at.getTime());
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (verify(null, Buffer.from(`${payload}${streampayUtcStamp(now)}`), key, signature)) return true;
    now.setTime(now.getTime() - 60_000);
  }
  return false;
}

/** GET callback: keys sorted, `key=value` joined with `&`. */
export function streampayQueryToSign(params: Record<string, string>): string {
  return Object.keys(params).sort().map((key) => `${key}=${params[key]}`).join("&");
}

export function parseStreampayCallback(input: Record<string, unknown>): StreamPayCallback | null {
  const externalId = stringField(input.external_id);
  const status = stringField(input.status)?.toLowerCase();
  if (!externalId || !status) return null;
  return {
    externalId,
    invoiceId: stringField(input.invoice) ?? "",
    amount: numberField(input.amount),
    // `amount` может быть в национальной валюте, поэтому не используем его
    // как замену расчётной сумме `merchant_total` в USDT.
    merchantTotal: numberField(input.merchant_total),
    currency: stringField(input.currency)?.toUpperCase() ?? null,
    systemCurrency: stringField(input.system_currency)?.toUpperCase() ?? null,
    status,
    errorMessage: parseStreampayMessages(input),
  };
}

function stringField(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function numberField(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
