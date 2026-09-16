import { compare } from "bcryptjs";
import { query } from "@/lib/server/db";
import { isSameOrigin, isValidEmail, jsonError, normalizeEmail } from "@/lib/server/http";
import { setPendingPinChallenge } from "@/lib/server/pending-pin";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { requestMeta } from "@/lib/server/request-meta";
import { createSession, sessionUserFromRow } from "@/lib/server/session";
import { recordWelcomeBonusLogin } from "@/lib/server/welcome-bonus";
import { verifyTurnstile } from "@/lib/server/turnstile";
import { isLocale } from "@/lib/i18n";
import { apiAuthCopy } from "@/lib/i18n/copy/api-auth";
import { requestLocale } from "@/lib/i18n/request-locale";
import { usageHistoryLocale } from "@/lib/usage-history-copy";

export const runtime = "nodejs";

type LoginRow = Parameters<typeof sessionUserFromRow>[0] & { password_hash: string | null; pin_hash: string | null; status:string; email_verified_at:Date|null };

export async function POST(request: Request) {
  const headerLocale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError(apiAuthCopy(headerLocale).invalidOrigin, 403);
  const body = await request.json().catch(() => null) as { email?: unknown; password?: unknown; remember?: unknown; turnstileToken?: unknown; locale?: unknown } | null;
  const locale = typeof body?.locale === "string" && isLocale(body.locale) ? body.locale : headerLocale;
  const copy = apiAuthCopy(locale);
  const email = normalizeEmail(body?.email);
  const password = String(body?.password ?? "");
  if (!isValidEmail(email) || !password) return jsonError(copy.invalidCredentials, 401);
  const meta = requestMeta(request);
  const allowed = await consumeRateLimit({
    scope: "login",
    identifier: `${meta.ipAddress ?? "unknown"}:${email}`,
    limit: 8,
    windowSeconds: 15 * 60,
  });
  if (!allowed) return jsonError(copy.tooManyAttempts, 429);
  if (!await verifyTurnstile(body?.turnstileToken, meta.ipAddress, "login")) return jsonError(copy.securityCheckFailed, 403);

  try {
    const rows = await query<LoginRow>(`SELECT id, email, password_hash, pin_hash, name, nickname, avatar_data_url,
      timezone, ai_tone, ai_preferences, registration_country, address_line, city, region, postal_code,
      balance_tokens, paid_balance_tokens, status, email_verified_at FROM users WHERE email = $1`, [email]);
    const row = rows[0];
    if (!row || !row.password_hash || !(await compare(password, row.password_hash))) return jsonError(copy.invalidCredentials, 401);
    if(row.status==="blocked") return jsonError(copy.accountBlocked,403);
    if(!row.email_verified_at) return jsonError(copy.verifyEmailFirst,403);
    if (row.pin_hash) {
      await setPendingPinChallenge(row.id);
      return Response.json({ error: copy.pinRequired, code: "PIN_REQUIRED" }, { status: 428 });
    }
    await query("UPDATE users SET last_login_at=now(),locale=$2,updated_at=now() WHERE id=$1",[row.id, usageHistoryLocale(locale)]);
    await createSession(row.id, request, body?.remember === true);
    await recordWelcomeBonusLogin(row.id).catch(() => undefined);
    return Response.json({ user: sessionUserFromRow(row) });
  } catch (error) {
    console.error("login_failed", error);
    return jsonError(copy.signInFailed, 500);
  }
}
