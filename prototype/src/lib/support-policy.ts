import type { Locale } from "./i18n/types";

const CORPORATE_DOMAINS = ["genora.art"];
const AUTOMATED_LOCAL = /^(?:mailer-daemon|postmaster|no-?reply|noreply|dont-?reply|do-?not-?reply|bounce|notifications?|newsletter|alert|daemon|dmarc|noreply-dmarc-support)\b/iu;
const AUTOMATED_SUBJECT = /(?:out of office|автоответ|delivery status|undeliverable|mailer-daemon|unsubscribe|do not reply|don't reply|no-?reply)/iu;
const AUTOMATED_BODY = /(?:do not reply|don't reply|no-?reply|noreply|this is an automated|это автоматическ)/iu;
const INQUIRY_PATTERN = /[?¿？]|помог|подскаж|не работает|ошибк|возврат|аккаунт|баланс|токен|парол|доступ|модель|счет|счёт|оплат|support|help|issue|bug|refund|account|billing|login|password|unable|cannot|can'?t|please/iu;

const BRAND_DOMAINS: Record<string, string> = {
  "freemius.com": "Freemius",
  "alipay.com": "Alipay",
  "hit-pay.com": "HitPay",
  "stripe.com": "Stripe",
  "paypal.com": "PayPal",
  "privateemail.com": "Privateemail",
  "google.com": "Google",
  "corp.mail.ru": "Mailru",
  "mail.ru": "Mailru",
};

export function normalizeSenderEmail(value?: string | null): string {
  const match = String(value ?? "").toLowerCase().match(/[^\s<>"]+@[^\s<>"]+/);
  return match?.[0]?.replace(/[<>]/g, "") ?? "";
}

export function senderDomain(email: string): string {
  return email.split("@")[1] ?? "";
}

export function corporateDomains(extra: string[] = []): string[] {
  return [...new Set([...CORPORATE_DOMAINS, ...extra.map((item) => item.trim().toLowerCase()).filter(Boolean)])];
}

export function isCorporateSender(email: string, extraEmails: string[] = [], extraDomains: string[] = []): boolean {
  const normalized = normalizeSenderEmail(email);
  if (!normalized) return false;
  if (extraEmails.map((item) => item.trim().toLowerCase()).includes(normalized)) return true;
  return corporateDomains(extraDomains).includes(senderDomain(normalized));
}

export function isAutomatedMail(input: { from: string; subject?: string; text?: string; headers?: Record<string, string | undefined> }): boolean {
  const local = normalizeSenderEmail(input.from).split("@")[0] ?? "";
  if (AUTOMATED_LOCAL.test(local)) return true;
  const headers = input.headers ?? {};
  if (headers["list-unsubscribe"] || headers["list-id"]) return true;
  if ((headers.precedence ?? "").toLowerCase() === "bulk") return true;
  if ((headers["auto-submitted"] ?? "").toLowerCase() && headers["auto-submitted"] !== "no") return true;
  if (AUTOMATED_SUBJECT.test(input.subject ?? "")) return true;
  if (AUTOMATED_BODY.test(`${input.subject ?? ""}\n${input.text ?? ""}`)) return true;
  if (/(?:unsubscribe|вы получили это письмо, потому что)/iu.test(input.text ?? "")) return true;
  return false;
}

function registrableDomain(domain: string): string {
  const parts = domain.split(".").filter(Boolean);
  if (parts.length < 2) return domain;
  return parts.slice(-2).join(".");
}

export function brandFolderName(email: string): string | null {
  const normalized = normalizeSenderEmail(email);
  if (!normalized) return null;
  if (isCorporateSender(normalized)) return "Genora.art";
  const domain = senderDomain(normalized);
  const mapped = BRAND_DOMAINS[domain] ?? BRAND_DOMAINS[registrableDomain(domain)];
  if (mapped) return mapped;
  if (isAutomatedMail({ from: normalized })) {
    const brand = domain.split(".").filter((part) => part !== "com" && part !== "net" && part !== "org" && part !== "mail").at(-2) ?? domain.split(".")[0];
    return brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : "Automated";
  }
  return null;
}

export function isCustomerInquiry(input: {
  channel: "web_form" | "email";
  from: string;
  subject?: string;
  text?: string;
  headers?: Record<string, string | undefined>;
  extraCorporateEmails?: string[];
  extraCorporateDomains?: string[];
}): boolean {
  if (input.channel === "web_form") return true;
  if (isCorporateSender(input.from, input.extraCorporateEmails, input.extraCorporateDomains)) return false;
  if (isAutomatedMail(input)) return false;
  const blob = `${input.subject ?? ""}\n${input.text ?? ""}`.trim();
  if (INQUIRY_PATTERN.test(blob)) return true;
  return blob.split(/\s+/).filter(Boolean).length >= 8;
}

export function shouldAutoReply(input: Parameters<typeof isCustomerInquiry>[0]): boolean {
  if (input.channel !== "web_form") return false;
  if (isCorporateSender(input.from, input.extraCorporateEmails, input.extraCorporateDomains)) return false;
  if (isAutomatedMail(input)) return false;
  return true;
}

export function detectMessageLocale(text: string, fallback: Locale = "en"): Locale {
  if (/[\u0400-\u04FF]/.test(text)) return "ru";
  if (/[\u4e00-\u9fff]/.test(text)) return "zh";
  if (/[\u3040-\u30ff]/.test(text)) return "ja";
  if (/[\uac00-\ud7af]/.test(text)) return "ko";
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  if (/[\u0370-\u03FF]/.test(text)) return "el";
  const known: Locale[] = ["ru", "en", "zh", "hi", "es", "fr", "ar", "pt", "de", "ja", "it", "ko", "tr", "pl", "nl", "sv", "cs", "el", "ro"];
  return known.includes(fallback) ? fallback : "en";
}

export function senderFolderName(email: string): string {
  const normalized = normalizeSenderEmail(email);
  return normalized.replace(/@/g, "_at_").replace(/[^a-z0-9._-]+/gi, "_").replace(/_+/g, "_").slice(0, 70) || "unknown";
}

export function shouldRunDailyOrganize(now: Date, lastOrganizedOn?: string | null): boolean {
  if (now.getUTCHours() < 12) return false;
  const today = now.toISOString().slice(0, 10);
  return lastOrganizedOn !== today;
}
