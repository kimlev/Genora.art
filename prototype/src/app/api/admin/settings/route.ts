import { isSameOrigin, jsonError } from "@/lib/server/http";
import { auditAdmin, requireAdmin } from "@/lib/server/admin-session";
import { getRegistrationBonusThousands, setRegistrationBonusThousands } from "@/lib/server/site-settings";
import { MAX_REGISTRATION_BONUS_THOUSANDS, MIN_REGISTRATION_BONUS_THOUSANDS, parseRegistrationBonusThousands } from "@/lib/site-settings";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const registrationBonusThousands = await getRegistrationBonusThousands();
    return Response.json({ registrationBonusThousands });
  } catch (error) {
    const unauthorized = (error as Error).message === "ADMIN_UNAUTHORIZED";
    return jsonError(unauthorized ? "Требуется вход" : "Не удалось загрузить настройки", unauthorized ? 401 : 500);
  }
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Недопустимый источник запроса", 403);
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => null) as { registrationBonusThousands?: unknown } | null;
    const parsed = parseRegistrationBonusThousands(body?.registrationBonusThousands);
    if (parsed === null) {
      return jsonError(`Укажите целое число от ${MIN_REGISTRATION_BONUS_THOUSANDS} до ${MAX_REGISTRATION_BONUS_THOUSANDS}`);
    }
    const registrationBonusThousands = await setRegistrationBonusThousands(parsed);
    await auditAdmin(request, admin.id, "site_settings_update", "site_settings", "registration_bonus_thousands", { registrationBonusThousands });
    return Response.json({ ok: true, registrationBonusThousands });
  } catch (error) {
    if ((error as Error).message === "ADMIN_UNAUTHORIZED") return jsonError("Требуется вход", 401);
    console.error("admin_settings_failed", error instanceof Error ? error.message : "unknown");
    return jsonError("Не удалось сохранить настройки", 500);
  }
}
