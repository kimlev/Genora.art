import { query } from "@/lib/server/db";
import { jsonError } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { isTotpUiEnabled } from "@/lib/server/totp";
import { apiAuthCopy } from "@/lib/i18n/copy/api-auth";
import { requestLocale } from "@/lib/i18n/request-locale";

export const runtime = "nodejs";

export async function GET() {
  const copy = apiAuthCopy(await requestLocale());
  try {
    const user = await requireUser();
    const rows = await query<{ pin_hash: string | null; totp_enabled_at: Date | null }>(
      "SELECT pin_hash, totp_enabled_at FROM users WHERE id=$1",
      [user.id],
    );
    const row = rows[0];
    return Response.json({
      pinEnabled: Boolean(row?.pin_hash),
      totpEnabled: Boolean(row?.totp_enabled_at),
      totpUiEnabled: isTotpUiEnabled(),
    });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(copy.authRequired, 401);
    console.error("security_status_failed", error instanceof Error ? error.message : "unknown");
    return jsonError(copy.securityLoadFailed, 500);
  }
}
