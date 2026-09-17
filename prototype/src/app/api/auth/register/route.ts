import { createHash, randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { withTransaction } from "@/lib/server/db";
import { isSameOrigin, isValidEmail, jsonError, normalizeEmail } from "@/lib/server/http";
import { sendEmailVerification } from "@/lib/server/mail";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { requestMeta } from "@/lib/server/request-meta";
import { LEGAL_DOCUMENT_VERSIONS } from "@/lib/legal/versions";
import { verifyTurnstile } from "@/lib/server/turnstile";
import { isLocale } from "@/lib/i18n";
import { apiAuthCopy } from "@/lib/i18n/copy/api-auth";
import { withLocalePath } from "@/lib/i18n/locale-path";
import { requestLocale } from "@/lib/i18n/request-locale";
import { getAuthMailCopy } from "@/lib/mail-auth-copy";
import { getRegistrationBonusTokens } from "@/lib/server/site-settings";
import { attachReferralSignup, startWelcomeBonusCampaign } from "@/lib/server/welcome-bonus";
import { usageHistoryCopy, usageHistoryLocale } from "@/lib/usage-history-copy";

export const runtime = "nodejs";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

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
  const body = await request.json().catch(() => null) as { email?: unknown; password?: unknown; name?: unknown; termsAccepted?: unknown; privacyAccepted?: unknown; turnstileToken?: unknown; locale?: unknown; ref?: unknown; visitorKey?: unknown } | null;
  const locale = typeof body?.locale === "string" && isLocale(body.locale) ? body.locale : headerLocale;
  const copy = apiAuthCopy(locale);
  const email = normalizeEmail(body?.email);
  const password = String(body?.password ?? "");
  const name = String(body?.name ?? "").trim().slice(0, 100) || null;
  if (!isValidEmail(email)) return jsonError(copy.invalidEmail);
  if (password.length < 8 || password.length > 128) return jsonError(copy.passwordLength(8, 128));
  if (body?.termsAccepted !== true || body?.privacyAccepted !== true) return jsonError(copy.acceptLegal);

  const meta = requestMeta(request);
  const allowed = await consumeRateLimit({
    scope: "register",
    identifier: `${meta.ipAddress ?? "unknown"}:${email}`,
    limit: 5,
    windowSeconds: 60 * 60,
  });
  if (!allowed) return jsonError(copy.tooManyAttempts, 429);
  if (!await verifyTurnstile(body?.turnstileToken, meta.ipAddress, "register")) return jsonError(copy.securityCheckFailed, 403);

  try {
    const passwordHash = await hash(password, 12);
    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(token);
    const historyCopy = usageHistoryCopy(locale);
    const bonusTokens = await getRegistrationBonusTokens();
    const result = await withTransaction(async (client) => {
      const reserved = await client.query("SELECT id FROM administrators WHERE email=$1 AND active=true", [email]);
      if (reserved.rowCount) throw new Error("ADMIN_EMAIL_RESERVED");
      const existing = await client.query<{ id: string; email_verified_at: Date | null }>(
        "SELECT id,email_verified_at FROM users WHERE email=$1 FOR UPDATE", [email],
      );
      if (existing.rows[0]?.email_verified_at) return { shouldSend: false };

      let userId = existing.rows[0]?.id;
      if (!userId) {
        const inserted = await client.query<{ id: string }>(`INSERT INTO users(email,password_hash,name,status,balance_tokens,locale)
          VALUES($1,$2,$3,'registration',$5,$4) RETURNING id`, [email, passwordHash, name, usageHistoryLocale(locale), bonusTokens]);
        userId = inserted.rows[0].id;
        await client.query(`INSERT INTO balance_transactions(user_id,kind,token_delta,note)
          VALUES($1,'bonus',$2,$3)`, [userId, bonusTokens, historyCopy.registrationBonus]);
        await startWelcomeBonusCampaign(client, userId);
        await attachReferralSignup(client, userId, typeof body?.visitorKey === "string" ? body.visitorKey : null, typeof body?.ref === "string" ? body.ref : null);
      } else {
        await client.query("UPDATE users SET password_hash=$2,name=coalesce($3,name),locale=$4,updated_at=now() WHERE id=$1", [userId,passwordHash,name,usageHistoryLocale(locale)]);
      }
      await client.query("DELETE FROM email_verification_tokens WHERE user_id=$1 AND used_at IS NULL", [userId]);
      for (const [documentSlug, documentVersion] of Object.entries(LEGAL_DOCUMENT_VERSIONS)) {
        await client.query(`INSERT INTO legal_acceptances(user_id,document_slug,document_version,ip_address,user_agent)
          VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,document_slug,document_version) DO UPDATE
          SET accepted_at=now(),ip_address=excluded.ip_address,user_agent=excluded.user_agent`,
        [userId, documentSlug, documentVersion, meta.ipAddress ?? null, request.headers.get("user-agent")?.slice(0, 500) ?? null]);
      }
      await client.query(`INSERT INTO email_verification_tokens(token_hash,user_id,expires_at)
        VALUES($1,$2,now()+interval '24 hours')`, [tokenHash, userId]);
      return { shouldSend: true };
    });

    if (result.shouldSend) {
      await sendEmailVerification(email, `${publicBaseUrl()}${withLocalePath("/verify-email", locale)}#${token}`, locale);
    }
    return Response.json(
      { pendingVerification: true, message: getAuthMailCopy(locale).verification.title },
      { status: 202 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("register_failed", message);
    if (message === "SMTP_NOT_CONFIGURED" || /timeout|ETIMEDOUT|ECONNREFUSED|ECONNRESET/i.test(message)) return jsonError(copy.mailNotConfigured, 503);
    if (message === "ADMIN_EMAIL_RESERVED") return jsonError(copy.adminEmailReserved, 409);
    return jsonError(copy.registerFailed, 500);
  }
}
