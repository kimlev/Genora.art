import { cookies } from "next/headers";
import { query, withTransaction } from "@/lib/server/db";
import {
  GOOGLE_STATE_COOKIE,
  exchangeCodeForIdentity,
  googleOAuthConfig,
  loginErrorUrl,
  publicBaseUrl,
  statesMatch,
  type GoogleIdentity,
} from "@/lib/server/google-oauth";
import { LEGAL_DOCUMENT_VERSIONS } from "@/lib/legal/versions";
import { setPendingPinChallenge } from "@/lib/server/pending-pin";
import { requestMeta } from "@/lib/server/request-meta";
import { createSession } from "@/lib/server/session";
import { recordWelcomeBonusLogin, startWelcomeBonusCampaign } from "@/lib/server/welcome-bonus";
import { requestLocale } from "@/lib/i18n/request-locale";
import { getRegistrationBonusTokens } from "@/lib/server/site-settings";
import { usageHistoryCopy, usageHistoryLocale } from "@/lib/usage-history-copy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StatePayload = { state: string; codeVerifier: string; returnTo: string };

function readStatePayload(raw: string | undefined): StatePayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StatePayload>;
    if (typeof parsed.state !== "string" || typeof parsed.codeVerifier !== "string") return null;
    const returnTo = typeof parsed.returnTo === "string" && parsed.returnTo.startsWith("/") ? parsed.returnTo : "/chat";
    return { state: parsed.state, codeVerifier: parsed.codeVerifier, returnTo };
  } catch {
    return null;
  }
}

async function resolveUserId(identity: GoogleIdentity, request: Request): Promise<string> {
  const meta = requestMeta(request);
  const locale = usageHistoryLocale(await requestLocale());
  const copy = usageHistoryCopy(locale);
  const bonusTokens = await getRegistrationBonusTokens();
  return withTransaction(async (client) => {
    const reserved = await client.query("SELECT id FROM administrators WHERE email=$1 AND active=true", [identity.email]);
    if (reserved.rowCount) throw new Error("ADMIN_EMAIL_RESERVED");

    const existing = await client.query<{ id: string; status: string }>(
      "SELECT id,status FROM users WHERE google_sub=$1 OR email=$2 FOR UPDATE", [identity.sub, identity.email],
    );
    const found = existing.rows[0];

    if (found) {
      if (found.status === "blocked") throw new Error("ACCOUNT_BLOCKED");
      await client.query(`UPDATE users SET google_sub=$2, name=coalesce(name,$3),
        email_verified_at=coalesce(email_verified_at,now()), last_login_at=now(), locale=$4, updated_at=now()
        WHERE id=$1`, [found.id, identity.sub, identity.name, locale]);
      return found.id;
    }

    const inserted = await client.query<{ id: string }>(`INSERT INTO users(email,name,google_sub,status,balance_tokens,email_verified_at,last_login_at,locale)
      VALUES($1,$2,$3,'registration',$5,now(),now(),$4) RETURNING id`, [identity.email, identity.name, identity.sub, locale, bonusTokens]);
    const userId = inserted.rows[0].id;
    await client.query(`INSERT INTO balance_transactions(user_id,kind,token_delta,note)
      VALUES($1,'bonus',$2,$3)`, [userId, bonusTokens, copy.registrationBonus]);
    await startWelcomeBonusCampaign(client, userId);
    for (const [documentSlug, documentVersion] of Object.entries(LEGAL_DOCUMENT_VERSIONS)) {
      await client.query(`INSERT INTO legal_acceptances(user_id,document_slug,document_version,ip_address,user_agent)
        VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,document_slug,document_version) DO UPDATE
        SET accepted_at=now(),ip_address=excluded.ip_address,user_agent=excluded.user_agent`,
      [userId, documentSlug, documentVersion, meta.ipAddress ?? null, meta.userAgent]);
    }
    return userId;
  });
}

export async function GET(request: Request) {
  const origin = publicBaseUrl();

  const store = await cookies();
  const payload = readStatePayload(store.get(GOOGLE_STATE_COOKIE)?.value);
  store.delete({ name: GOOGLE_STATE_COOKIE, path: "/api/auth/google" });

  const params = new URL(request.url).searchParams;
  if (params.get("error")) return Response.redirect(loginErrorUrl("google_cancelled"), 302);

  const code = params.get("code");
  const state = params.get("state");
  if (!payload || !code || !state || !statesMatch(payload.state, state)) {
    return Response.redirect(loginErrorUrl("google_state_invalid"), 302);
  }

  try {
    const identity = await exchangeCodeForIdentity(googleOAuthConfig(), code, payload.codeVerifier);
    if (!identity.emailVerified) return Response.redirect(loginErrorUrl("google_email_unverified"), 302);
    const userId = await resolveUserId(identity, request);
    const pinRows = await query<{ pin_hash: string | null }>("SELECT pin_hash FROM users WHERE id=$1", [userId]);
    if (pinRows[0]?.pin_hash) {
      await setPendingPinChallenge(userId);
      return Response.redirect(`${origin}/login?pin=1`, 302);
    }
    await createSession(userId, request, true);
    await recordWelcomeBonusLogin(userId).catch(() => undefined);
    return Response.redirect(`${origin}${payload.returnTo}`, 302);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("google_oauth_callback_failed", message);
    if (message === "ACCOUNT_BLOCKED") return Response.redirect(loginErrorUrl("account_blocked"), 302);
    if (message === "ADMIN_EMAIL_RESERVED") return Response.redirect(loginErrorUrl("admin_email_reserved"), 302);
    return Response.redirect(loginErrorUrl("google_failed"), 302);
  }
}
