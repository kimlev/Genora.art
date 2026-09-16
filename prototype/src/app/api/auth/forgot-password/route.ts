import { createHash, randomBytes } from "node:crypto";
import { query, withTransaction } from "@/lib/server/db";
import { isSameOrigin, isValidEmail, jsonError, normalizeEmail } from "@/lib/server/http";
import { sendPasswordReset } from "@/lib/server/mail";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { requestMeta } from "@/lib/server/request-meta";
import { isLocale } from "@/lib/i18n";
import { apiAuthCopy } from "@/lib/i18n/copy/api-auth";
import { withLocalePath } from "@/lib/i18n/locale-path";
import { requestLocale } from "@/lib/i18n/request-locale";

export const runtime = "nodejs";

function publicBaseUrl(): string {
  const value = process.env.APP_BASE_URL?.trim();
  if (!value) throw new Error("APP_BASE_URL_NOT_CONFIGURED");
  const url = new URL(value);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error("APP_BASE_URL_MUST_USE_HTTPS");
  return url.origin;
}

export async function POST(request: Request) {
  const headerLocale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError(apiAuthCopy(headerLocale).invalidOrigin, 403);
  const body = await request.json().catch(() => null) as { email?: unknown; locale?: unknown } | null;
  const locale = typeof body?.locale === "string" && isLocale(body.locale) ? body.locale : headerLocale;
  const copy = apiAuthCopy(locale);
  const email = normalizeEmail(body?.email);
  const meta = requestMeta(request);
  const allowed = await consumeRateLimit({ scope: "forgot-password", identifier: `${meta.ipAddress ?? "unknown"}:${email}`, limit: 4, windowSeconds: 60 * 60 });
  if (!allowed) return jsonError(copy.tooManyAttempts, 429);
  if (!isValidEmail(email)) return Response.json({ ok: true }, { status: 202 });

  try {
    const users = await query<{ id: string }>("SELECT id FROM users WHERE email=$1 AND status<>'blocked' AND email_verified_at IS NOT NULL", [email]);
    if (users[0]) {
      const token = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      await withTransaction(async (client) => {
        await client.query("DELETE FROM password_reset_tokens WHERE user_id=$1 AND used_at IS NULL", [users[0].id]);
        await client.query("INSERT INTO password_reset_tokens(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')", [tokenHash, users[0].id]);
      });
      await sendPasswordReset(email, `${publicBaseUrl()}${withLocalePath("/reset-password", locale)}#${token}`, locale);
    }
    return Response.json({ ok: true }, { status: 202 });
  } catch (error) {
    console.error("forgot_password_failed", error instanceof Error ? error.message : "unknown");
    return jsonError(copy.mailSendFailed, 503);
  }
}
