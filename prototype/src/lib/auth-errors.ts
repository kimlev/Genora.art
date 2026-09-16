import type { Locale } from "@/lib/i18n";
import { authUiCopy, type AuthUiCopy } from "@/lib/i18n/copy/auth-ui";

const AUTH_ERROR_KEYS: Record<string, keyof AuthUiCopy["errors"]> = {
  google_unavailable: "googleUnavailable",
  google_cancelled: "googleCancelled",
  google_state_invalid: "googleStateInvalid",
  google_email_unverified: "googleEmailUnverified",
  google_failed: "googleFailed",
  account_blocked: "accountBlocked",
  admin_email_reserved: "adminEmailReserved",
  rate_limited: "rateLimited",
};

export function authErrorMessage(code: unknown, locale: Locale): string | null {
  if (typeof code !== "string") return null;
  const key = AUTH_ERROR_KEYS[code];
  return key ? authUiCopy(locale).errors[key] : null;
}
