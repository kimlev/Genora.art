/** Официальный дневной курс ЦБ РФ: без ключа, без регистрации. */
export const CBR_PRIMARY_URL = "https://www.cbr.ru/scripts/XML_daily.asp";
/** То же самое в JSON, если сайт ЦБ не ответил. */
export const CBR_FALLBACK_URL = "https://www.cbr-xml-daily.ru/daily_json.js";

const FX_TIMEOUT_MS = 8_000;
const FX_CACHE_MS = 30 * 60_000;
const cache = new Map<string, { rate: number; at: number }>();

/** Разбирает типичные JSON-ответы курсов к USD. */
export function parseUsdRate(payload: unknown, currency: string): number | null {
  if (!payload || typeof payload !== "object") return null;
  const code = currency.toUpperCase();
  const root = payload as Record<string, unknown>;
  const bags = [root.rates, root.conversion_rates, root.data, root];
  for (const bag of bags) {
    if (!bag || typeof bag !== "object") continue;
    const value = Number((bag as Record<string, unknown>)[code]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function commaNumber(value: string): number {
  return Number(value.replace(",", "."));
}

function cbrUnitRateFromXml(xml: string, charCode: string): number | null {
  const index = xml.indexOf(`<CharCode>${charCode}</CharCode>`);
  if (index < 0) return null;
  const slice = xml.slice(Math.max(0, index - 80), index + 360);
  const unit = /<VunitRate>([\d,]+(?:[eE][+-]?\d+)?)<\/VunitRate>/.exec(slice);
  if (unit) {
    const rate = commaNumber(unit[1]);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  }
  const value = /<Value>([\d,]+)<\/Value>/.exec(slice);
  const nominal = /<Nominal>(\d+)<\/Nominal>/.exec(slice);
  if (!value || !nominal) return null;
  const rate = commaNumber(value[1]) / Number(nominal[1]);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

/** ЦБ отдаёт иностранные валюты к рублю. Нужно «сколько нац. валюты за $1». */
export function parseCbrXml(xml: string, currency: string): number | null {
  const code = currency.toUpperCase();
  const usd = cbrUnitRateFromXml(xml, "USD");
  if (!usd) return null;
  if (code === "RUB") return usd;
  const other = cbrUnitRateFromXml(xml, code);
  if (!other) return null;
  const rate = usd / other;
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

function cbrValute(payload: unknown, charCode: string): number | null {
  if (!payload || typeof payload !== "object") return null;
  const valute = (payload as { Valute?: Record<string, { Value?: unknown; VunitRate?: unknown }> }).Valute;
  const row = valute?.[charCode];
  const rate = Number(row?.VunitRate ?? row?.Value);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

export function parseCbrJson(payload: unknown, currency: string): number | null {
  const code = currency.toUpperCase();
  const usd = cbrValute(payload, "USD");
  if (!usd) return null;
  if (code === "RUB") return usd;
  const other = cbrValute(payload, code);
  if (!other) return null;
  const rate = usd / other;
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

export function roundFx(amount: number, decimals: number): number {
  const places = Math.min(8, Math.max(0, Math.trunc(decimals)));
  const factor = 10 ** places;
  return Math.round(amount * factor) / factor;
}

/** Коды админки: −2 = до 100, −1 = до 10, 0 = целое, 1 = 0,0, 2 = 0,00. */
export function applyFxRounding(amount: number, code: number): number {
  if (!Number.isFinite(amount) || amount < 0) return 0;
  if (code < 0) {
    const step = 10 ** (-code);
    return Math.round(amount / step) * step;
  }
  return roundFx(amount, code);
}

export function nationalCharge(amountUsd: number, usdRate: number, rounding: number): number {
  return applyFxRounding(amountUsd * usdRate, rounding);
}

function parseRateText(text: string, currency: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("<")) return parseCbrXml(trimmed, currency);
  try {
    const payload = JSON.parse(trimmed) as unknown;
    return parseCbrJson(payload, currency) ?? parseUsdRate(payload, currency);
  } catch {
    return null;
  }
}

export async function fetchUsdRate(url: string, currency: string): Promise<number> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { accept: "application/xml,application/json,text/plain,*/*", "user-agent": "Genora.art/1.0" },
    signal: AbortSignal.timeout(FX_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("FX_RATE_HTTP");
  const rate = parseRateText(await response.text(), currency);
  if (!rate) throw new Error("FX_RATE_MISSING");
  return rate;
}

export function fxFallbackUrls(primaryUrl: string | null): string[] {
  const urls = [primaryUrl?.trim(), CBR_PRIMARY_URL, CBR_FALLBACK_URL]
    .filter((url): url is string => Boolean(url));
  return [...new Set(urls)];
}

export async function fetchUsdRateWithFallback(urls: string[], currency: string): Promise<number> {
  const code = currency.toUpperCase();
  const key = `${urls.join("|")}|${code}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < FX_CACHE_MS) return hit.rate;

  let lastError: unknown = null;
  for (const url of urls) {
    try {
      const rate = await fetchUsdRate(url, code);
      cache.set(key, { rate, at: Date.now() });
      return rate;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("FX_RATE_MISSING");
}
