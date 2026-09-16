import { compare, hash } from "bcryptjs";
import { query, withTransaction } from "@/lib/server/db";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import { clearSession, requireUser } from "@/lib/server/session";
import { isLocale } from "@/lib/i18n";
import { apiAuthCopy } from "@/lib/i18n/copy/api-auth";
import { requestLocale } from "@/lib/i18n/request-locale";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const headerLocale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError(apiAuthCopy(headerLocale).invalidOrigin, 403);
  const body = await request.json().catch(() => null) as { currentPassword?: unknown; newPassword?: unknown; locale?: unknown } | null;
  const copy = apiAuthCopy(typeof body?.locale === "string" && isLocale(body.locale) ? body.locale : headerLocale);
  try {
    const user = await requireUser();
    const currentPassword = String(body?.currentPassword ?? "");
    const newPassword = String(body?.newPassword ?? "");
    if (newPassword.length < 8 || newPassword.length > 128) return jsonError(copy.passwordLength(8, 128));
    const rows = await query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id=$1", [user.id]);
    if (!rows[0] || !await compare(currentPassword, rows[0].password_hash)) return jsonError(copy.currentPasswordWrong, 401);
    const passwordHash = await hash(newPassword, 12);
    await withTransaction(async (client) => {
      await client.query("UPDATE users SET password_hash=$2,updated_at=now() WHERE id=$1", [user.id, passwordHash]);
      await client.query("DELETE FROM sessions WHERE user_id=$1", [user.id]);
    });
    await clearSession();
    return Response.json({ ok: true });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(copy.authRequired, 401);
    console.error("password_change_failed", error instanceof Error ? error.message : "unknown");
    return jsonError(copy.passwordChangeFailed, 500);
  }
}
