import { compare } from "bcryptjs";
import { normalizePin } from "@/lib/pin";
import { query } from "@/lib/server/db";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import { clearPendingPinChallenge, readPendingPinChallenge } from "@/lib/server/pending-pin";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { requestMeta } from "@/lib/server/request-meta";
import { createSession, sessionUserFromRow } from "@/lib/server/session";
import { recordWelcomeBonusLogin } from "@/lib/server/welcome-bonus";
import { isLocale } from "@/lib/i18n";
import { apiAuthCopy } from "@/lib/i18n/copy/api-auth";
import { requestLocale } from "@/lib/i18n/request-locale";

export const runtime = "nodejs";

const PIN_LENGTH = 4;

type UserRow = Parameters<typeof sessionUserFromRow>[0] & { pin_hash: string | null; status: string; email_verified_at: Date | null };

export async function POST(request: Request) {
  const headerLocale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError(apiAuthCopy(headerLocale).invalidOrigin, 403);
  const body = await request.json().catch(() => null) as { pin?: unknown; locale?: unknown } | null;
  const copy = apiAuthCopy(typeof body?.locale === "string" && isLocale(body.locale) ? body.locale : headerLocale);
  const pin = normalizePin(body?.pin);
  if (!pin) return jsonError(copy.pinDigits(PIN_LENGTH));
  const meta = requestMeta(request);
  const allowed = await consumeRateLimit({
    scope: "login-pin",
    identifier: meta.ipAddress ?? "unknown",
    limit: 8,
    windowSeconds: 15 * 60,
  });
  if (!allowed) return jsonError(copy.tooManyAttempts, 429);

  try {
    const userId = await readPendingPinChallenge();
    if (!userId) return jsonError(copy.pinSessionExpired, 401);
    const rows = await query<UserRow>(`SELECT id, email, name, nickname, avatar_data_url,
      timezone, ai_tone, ai_preferences, registration_country, address_line, city, region, postal_code,
      balance_tokens, paid_balance_tokens, status, email_verified_at, pin_hash FROM users WHERE id=$1`, [userId]);
    const row = rows[0];
    if (!row?.pin_hash) {
      await clearPendingPinChallenge();
      return jsonError(copy.pinNotEnabled, 400);
    }
    if (row.status === "blocked") return jsonError(copy.accountBlocked, 403);
    if (!row.email_verified_at) return jsonError(copy.verifyEmailFirst, 403);
    if (!await compare(pin, row.pin_hash)) return Response.json({ error: copy.pinInvalid, code: "PIN_REQUIRED" }, { status: 401 });
    await query("UPDATE users SET last_login_at=now(), updated_at=now() WHERE id=$1", [row.id]);
    await createSession(row.id, request, true);
    await recordWelcomeBonusLogin(row.id).catch(() => undefined);
    await clearPendingPinChallenge();
    return Response.json({ user: sessionUserFromRow(row) });
  } catch (error) {
    console.error("pin_complete_failed", error);
    return jsonError(copy.signInFailed, 500);
  }
}
