import "server-only";

function configuredOrigin(value: string | undefined, missingCode: string): string {
  const raw = value?.trim();
  if (!raw) throw new Error(missingCode);
  const url = new URL(raw);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("PUBLIC_ORIGIN_MUST_USE_HTTPS");
  }
  return url.origin;
}

/** Origin for links sent to end users (registration, reset, OAuth callbacks). */
export function publicAppOrigin(): string {
  return configuredOrigin(process.env.APP_BASE_URL, "APP_BASE_URL_NOT_CONFIGURED");
}

/** Origin for links sent by the administrator application. */
export function publicAdminOrigin(): string {
  return configuredOrigin(process.env.ADMIN_PUBLIC_ORIGIN, "ADMIN_PUBLIC_ORIGIN_NOT_CONFIGURED");
}
