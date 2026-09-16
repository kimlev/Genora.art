import { compare, hash } from "bcryptjs";
import { normalizePin } from "@/lib/pin";
import { query } from "@/lib/server/db";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { isLocale } from "@/lib/i18n";
import { apiAuthCopy } from "@/lib/i18n/copy/api-auth";
import { requestLocale } from "@/lib/i18n/request-locale";

export const runtime = "nodejs";

const PIN_LENGTH = 4;

export async function POST(request: Request) {
  const headerLocale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError(apiAuthCopy(headerLocale).invalidOrigin, 403);
  const body = await request.json().catch(() => null) as { pin?: unknown; confirmPin?: unknown; locale?: unknown } | null;
  const copy = apiAuthCopy(typeof body?.locale === "string" && isLocale(body.locale) ? body.locale : headerLocale);
  try {
    const user = await requireUser();
    const pin = normalizePin(body?.pin);
    const confirmPin = normalizePin(body?.confirmPin);
    if (!pin || !confirmPin) return jsonError(copy.pinDigits(PIN_LENGTH));
    if (pin !== confirmPin) return jsonError(copy.pinMismatch);
    const existing = await query<{ pin_hash: string | null }>("SELECT pin_hash FROM users WHERE id=$1", [user.id]);
    if (existing[0]?.pin_hash) return jsonError(copy.pinAlreadyOn);
    await query("UPDATE users SET pin_hash=$2, updated_at=now() WHERE id=$1", [user.id, await hash(pin, 12)]);
    return Response.json({ ok: true, pinEnabled: true });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(copy.authRequired, 401);
    console.error("pin_set_failed", error instanceof Error ? error.message : "unknown");
    return jsonError(copy.pinSaveFailed, 500);
  }
}

export async function DELETE(request: Request) {
  const headerLocale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError(apiAuthCopy(headerLocale).invalidOrigin, 403);
  const body = await request.json().catch(() => null) as { pin?: unknown; locale?: unknown } | null;
  const copy = apiAuthCopy(typeof body?.locale === "string" && isLocale(body.locale) ? body.locale : headerLocale);
  try {
    const user = await requireUser();
    const pin = normalizePin(body?.pin);
    if (!pin) return jsonError(copy.pinDigits(PIN_LENGTH));
    const rows = await query<{ pin_hash: string | null }>("SELECT pin_hash FROM users WHERE id=$1", [user.id]);
    if (!rows[0]?.pin_hash) return jsonError(copy.pinAlreadyOff);
    if (!await compare(pin, rows[0].pin_hash)) return jsonError(copy.pinInvalid, 401);
    await query("UPDATE users SET pin_hash=NULL, updated_at=now() WHERE id=$1", [user.id]);
    return Response.json({ ok: true, pinEnabled: false });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(copy.authRequired, 401);
    console.error("pin_clear_failed", error instanceof Error ? error.message : "unknown");
    return jsonError(copy.pinDisableFailed, 500);
  }
}
