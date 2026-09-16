import { isSameOrigin, jsonError } from "@/lib/server/http";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { requestMeta } from "@/lib/server/request-meta";
import { PREVIEW_COOKIE, previewCredentialsMatch, setPreviewCookie, verifyPreviewToken } from "@/lib/server/preview-auth";
import { isLocale } from "@/lib/i18n";
import { apiAuthCopy } from "@/lib/i18n/copy/api-auth";
import { requestLocale } from "@/lib/i18n/request-locale";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
  const copy = apiAuthCopy(await requestLocale());
  try {
    const valid = verifyPreviewToken((await cookies()).get(PREVIEW_COOKIE)?.value);
    return valid ? Response.json({ ok: true }) : jsonError(copy.authRequired, 401);
  } catch {
    return jsonError(copy.previewNotConfigured, 503);
  }
}

export async function POST(request: Request) {
  const headerLocale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError(apiAuthCopy(headerLocale).invalidOrigin, 403);
  const body = await request.json().catch(() => null) as { username?: unknown; password?: unknown; remember?: unknown; locale?: unknown } | null;
  const copy = apiAuthCopy(typeof body?.locale === "string" && isLocale(body.locale) ? body.locale : headerLocale);
  const username = String(body?.username ?? "").slice(0, 80);
  const password = String(body?.password ?? "").slice(0, 200);
  const meta = requestMeta(request);
  if (!await consumeRateLimit({ scope: "preview-login", identifier: meta.ipAddress ?? "unknown", limit: 8, windowSeconds: 15 * 60 })) return jsonError(copy.tooManyAttempts, 429);
  try {
    if (!username || !password || !await previewCredentialsMatch(username, password)) return jsonError(copy.invalidLoginOrPassword, 401);
    await setPreviewCookie(body?.remember === true);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("preview_login_failed", error instanceof Error ? error.message : "unknown");
    return jsonError(copy.signInFailed, 500);
  }
}
