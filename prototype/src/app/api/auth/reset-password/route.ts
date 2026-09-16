import { createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { withTransaction } from "@/lib/server/db";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import { isLocale } from "@/lib/i18n";
import { apiAuthCopy } from "@/lib/i18n/copy/api-auth";
import { requestLocale } from "@/lib/i18n/request-locale";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const headerLocale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError(apiAuthCopy(headerLocale).invalidOrigin, 403);
  const body = await request.json().catch(() => null) as { token?: unknown; password?: unknown; locale?: unknown } | null;
  const copy = apiAuthCopy(typeof body?.locale === "string" && isLocale(body.locale) ? body.locale : headerLocale);
  const token = String(body?.token ?? "");
  const password = String(body?.password ?? "");
  if (!/^[A-Za-z0-9_-]{40,80}$/.test(token)) return jsonError(copy.resetLinkInvalid, 400);
  if (password.length < 8 || password.length > 128) return jsonError(copy.passwordLength(8, 128));
  const tokenHash = createHash("sha256").update(token).digest("hex");

  try {
    const changed = await withTransaction(async (client) => {
      const rows = await client.query<{ user_id: string }>(`SELECT user_id FROM password_reset_tokens
        WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE`, [tokenHash]);
      if (!rows.rows[0]) return false;
      const passwordHash = await hash(password, 12);
      await client.query("UPDATE users SET password_hash=$2,updated_at=now() WHERE id=$1", [rows.rows[0].user_id, passwordHash]);
      await client.query("UPDATE password_reset_tokens SET used_at=now() WHERE token_hash=$1", [tokenHash]);
      await client.query("DELETE FROM sessions WHERE user_id=$1", [rows.rows[0].user_id]);
      return true;
    });
    if (!changed) return jsonError(copy.linkExpired, 410);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("reset_password_failed", error instanceof Error ? error.message : "unknown");
    return jsonError(copy.passwordChangeFailed, 500);
  }
}
