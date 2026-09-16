import { isKnownCountry } from "@/lib/geo/countries";
import { isFxRoundingCode } from "./fx-rounding";

export type InvoiceCurrency = "usd" | "national";
export type FeePayer = "client" | "merchant";

export type NewProvider = {
  name: string;
  /** Пустая строка допустима: ссылку выдаёт интеграция с провайдером, а не админ. */
  checkoutUrl: string;
  /** Пустой список означает «весь мир». */
  countryCodes: string[];
  methodIds: string[];
  invoiceCurrency: InvoiceCurrency;
  feePayer: FeePayer;
  /** Проценты, которые удерживает провайдер. Пусто — ставку ещё не задали. */
  feePercent: number | null;
  enabled: boolean;
  clientVisible: boolean;
  /** Только для счетов в национальной валюте: откуда брать курс к USD. */
  fxRateUrl: string;
  /** Знаков после запятой; 0 — целое число. */
  fxRounding: number | null;
};

export const MAX_METHOD_LOGO_BYTES = 200_000;
export const LOGO_DATA_URL = /^data:([^;,]+);base64,([\s\S]+)$/;
const ALLOWED_LOGO_MIMES = new Set(["image/png", "image/webp", "image/svg+xml", "image/jpeg"]);

const CYRILLIC: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  і: "i", ї: "yi", є: "ye", ў: "u", ґ: "g",
};

/**
 * Идентификатор попадает в ссылки и логи, поэтому только латиница и дефисы.
 * Русские названия транслитерируем, иначе от «Сбербанка» не осталось бы ничего.
 */
export function slugFromName(name: string): string {
  const slug = [...name.toLowerCase()]
    .map((letter) => CYRILLIC[letter] ?? letter)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || `id-${Date.now().toString(36)}`;
}

/** Возвращает текст ошибки для админа или `null`, если данные годны. */
export function validateProvider(input: NewProvider): string | null {
  if (input.name.trim().length < 2) return "Укажите название провайдера";
  if (input.name.trim().length > 60) return "Название не длиннее 60 символов";
  if (input.checkoutUrl.trim()) {
    let url: URL;
    try { url = new URL(input.checkoutUrl); } catch { return "Ссылка на оплату должна быть полным адресом"; }
    if (url.protocol !== "https:") return "Ссылка на оплату должна начинаться с https";
  }
  if (input.countryCodes.some((code) => !isKnownCountry(code))) return "В списке стран есть неизвестный код";
  if (new Set(input.countryCodes).size !== input.countryCodes.length) return "Страна выбрана дважды";
  if (!input.methodIds.length) return "Выберите хотя бы один метод оплаты";
  if (input.invoiceCurrency === "national") {
    if (!input.countryCodes.length) return "Для национальной валюты выберите страны";
    if (!input.fxRateUrl.trim()) return "Укажите ссылку на курс валюты";
    let url: URL;
    try { url = new URL(input.fxRateUrl.trim()); } catch { return "Ссылка на курс должна быть полным адресом"; }
    if (url.protocol !== "https:") return "Ссылка на курс должна начинаться с https";
    if (!isFxRoundingCode(input.fxRounding)) return "Задайте округление суммы";
  }
  return validateFeePercent(input.feePercent);
}

/** Ставка в процентах: пусто можно, иначе от 0 до 100 включительно. */
export function validateFeePercent(value: number | null): string | null {
  if (value === null) return null;
  if (!Number.isFinite(value) || value < 0 || value > 100) return "Комиссия — число от 0 до 100 процентов";
  return null;
}

/**
 * Метод оплаты привязан к странам: СБП есть только в России, поэтому провайдеру
 * «на весь мир» он не подходит. Пустой список стран у метода означает «везде».
 *
 * @param methodCountries страны метода
 * @param providerCountries страны провайдера; пустой список — «весь мир»
 */
export function methodFitsRegion(methodCountries: string[], providerCountries: string[]): boolean {
  if (!methodCountries.length) return true;
  if (!providerCountries.length) return false;
  return methodCountries.some((code) => providerCountries.includes(code));
}

export function validateMethodName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 40) return "Название метода от 2 до 40 символов";
  return null;
}

export function validateMethodLogo(dataUrl: string, byteLength: (base64: string) => number): string | null {
  const match = LOGO_DATA_URL.exec(dataUrl);
  if (!match) return "Логотип нужно загрузить файлом";
  if (!ALLOWED_LOGO_MIMES.has(match[1])) return "Логотип принимается в PNG, WebP, JPEG или SVG";
  if (byteLength(match[2]) > MAX_METHOD_LOGO_BYTES) return "Логотип не больше 200 КБ";
  return null;
}
