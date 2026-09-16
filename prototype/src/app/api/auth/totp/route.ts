import { query } from "@/lib/server/db";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import {
  decryptSecret,
  encryptSecret,
  generateTotpSecret,
  totpOtpauthUri,
  totpQrSvg,
  verifyTotpCode,
} from "@/lib/server/totp";
import { isLocale } from "@/lib/i18n";
import { apiAuthCopy } from "@/lib/i18n/copy/api-auth";
import { requestLocale } from "@/lib/i18n/request-locale";

export const runtime = "nodejs";

type TotpRow = {
  email: string;
  totp_secret: string | null;
  totp_pending_secret: string | null;
  totp_enabled_at: Date | null;
};

export async function POST(request: Request) {
  const headerLocale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError(apiAuthCopy(headerLocale).invalidOrigin, 403);
  const body = await request.json().catch(() => null) as { action?: unknown; code?: unknown; locale?: unknown } | null;
  const copy = apiAuthCopy(typeof body?.locale === "string" && isLocale(body.locale) ? body.locale : headerLocale);
  try {
    const user = await requireUser();
    const action = String(body?.action ?? "setup");
    const rows = await query<TotpRow>(
      "SELECT email, totp_secret, totp_pending_secret, totp_enabled_at FROM users WHERE id=$1",
      [user.id],
    );
    const row = rows[0];
    if (!row) return jsonError(copy.authRequired, 401);

    if (action === "setup") {
      if (row.totp_enabled_at) return jsonError(copy.totpAlreadyOn);
      const secret = generateTotpSecret();
      await query("UPDATE users SET totp_pending_secret=$2, updated_at=now() WHERE id=$1", [user.id, encryptSecret(secret)]);
      const otpauth = totpOtpauthUri(row.email, secret);
      return Response.json({ otpauth, qrSvg: await totpQrSvg(otpauth), secret });
    }

    if (action === "enable") {
      if (row.totp_enabled_at) return jsonError(copy.totpAlreadyOn);
      if (!row.totp_pending_secret) return jsonError(copy.totpScanFirst);
      const secret = decryptSecret(row.totp_pending_secret);
      if (!verifyTotpCode(secret, body?.code)) return jsonError(copy.totpInvalidCode, 401);
      await query("UPDATE users SET totp_secret=$2, totp_pending_secret=NULL, totp_enabled_at=now(), updated_at=now() WHERE id=$1", [
        user.id,
        encryptSecret(secret),
      ]);
      return Response.json({ ok: true, totpEnabled: true });
    }

    if (action === "disable") {
      if (!row.totp_secret || !row.totp_enabled_at) return jsonError(copy.totpAlreadyOff);
      if (!verifyTotpCode(decryptSecret(row.totp_secret), body?.code)) return jsonError(copy.totpInvalidCode, 401);
      await query("UPDATE users SET totp_secret=NULL, totp_pending_secret=NULL, totp_enabled_at=NULL, updated_at=now() WHERE id=$1", [user.id]);
      return Response.json({ ok: true, totpEnabled: false });
    }

    return jsonError(copy.unknownAction);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(copy.authRequired, 401);
    console.error("totp_update_failed", error instanceof Error ? error.message : "unknown");
    return jsonError(copy.totpUpdateFailed, 500);
  }
}
