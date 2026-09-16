import { query } from "@/lib/server/db";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import { requireUser, sessionUserFromRow } from "@/lib/server/session";
import { isRequestLocale } from "@/lib/locale-from-request";
import { apiAuthCopy } from "@/lib/i18n/copy/api-auth";
import { requestLocale } from "@/lib/i18n/request-locale";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const headerLocale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError(apiAuthCopy(headerLocale).invalidOrigin, 403);
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const locale = typeof body.locale === "string" && isRequestLocale(body.locale) ? body.locale : null;
  const copy = apiAuthCopy(locale ?? headerLocale);
  try {
    const user = await requireUser();
    const value = (key: string, max: number) => typeof body[key] === "string" ? String(body[key]).trim().slice(0, max) || null : null;
    const rows = await query<Parameters<typeof sessionUserFromRow>[0]>(`UPDATE users SET
      name = COALESCE($2, name), nickname = COALESCE($3, nickname),
      avatar_data_url = COALESCE($4, avatar_data_url), timezone = COALESCE($5, timezone),
      ai_tone = COALESCE($6, ai_tone), ai_preferences = COALESCE($7, ai_preferences),
      registration_country = COALESCE($8, registration_country), address_line = COALESCE($9, address_line),
      city = COALESCE($10, city), region = COALESCE($11, region), postal_code = COALESCE($12, postal_code),
      locale = COALESCE($13, locale),
      updated_at = now()
      WHERE id = $1 RETURNING id, email, name, nickname, avatar_data_url, timezone, ai_tone, ai_preferences,
        registration_country, address_line, city, region, postal_code, balance_tokens, paid_balance_tokens`,
      [user.id, value("name", 100), value("nickname", 25), value("avatarDataUrl", 1_500_000), value("timezone", 80), value("aiTone", 30), value("aiPreferences", 4_000),
        value("registrationCountry", 80), value("addressLine", 240), value("city", 100), value("region", 100), value("postalCode", 20), locale]);
    return Response.json({ user: sessionUserFromRow(rows[0]) });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(copy.authRequired, 401);
    console.error("profile_update_failed", error);
    return jsonError(copy.profileSaveFailed, 500);
  }
}
