import { createHash } from "node:crypto";
import { withTransaction } from "@/lib/server/db";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import { isLocale } from "@/lib/i18n";
import { apiAuthCopy } from "@/lib/i18n/copy/api-auth";
import { requestLocale } from "@/lib/i18n/request-locale";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const headerLocale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError(apiAuthCopy(headerLocale).invalidOrigin, 403);
  const body = await request.json().catch(() => null) as { token?: unknown; locale?: unknown } | null;
  const copy = apiAuthCopy(typeof body?.locale === "string" && isLocale(body.locale) ? body.locale : headerLocale);
  const token = String(body?.token ?? "");
  if (!/^[A-Za-z0-9_-]{40,80}$/.test(token)) return jsonError(copy.verifyLinkInvalid, 400);
  const tokenHash = createHash("sha256").update(token).digest("hex");
  try {
    const verified = await withTransaction(async (client) => {
      const rows = await client.query<{ user_id: string }>(`SELECT user_id FROM email_verification_tokens
        WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE`, [tokenHash]);
      if (!rows.rows[0]) return false;
      await client.query("UPDATE email_verification_tokens SET used_at=now() WHERE token_hash=$1", [tokenHash]);
      await client.query("UPDATE users SET email_verified_at=coalesce(email_verified_at,now()),updated_at=now() WHERE id=$1", [rows.rows[0].user_id]);
      return true;
    });
    if (!verified) return jsonError(copy.linkExpired, 410);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("verify_email_failed", error instanceof Error ? error.message : "unknown");
    return jsonError(copy.verifyEmailFailed, 500);
  }
}
