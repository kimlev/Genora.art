import { requireAdmin } from "@/lib/server/admin-session";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import { getCurrentWelcomeBonusSettings, listWelcomeBonusLogs, saveWelcomeBonusSettings } from "@/lib/server/welcome-bonus";
import { parseWelcomeBonusConfig, welcomeBonusTotal } from "@/lib/welcome-bonus";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const settings = await getCurrentWelcomeBonusSettings();
    const logs = await listWelcomeBonusLogs();
    return Response.json({ ...settings, total: welcomeBonusTotal(settings.config), logs });
  } catch (error) {
    if ((error as Error).message === "ADMIN_UNAUTHORIZED") return jsonError("Нужна авторизация", 401);
    return jsonError("Не удалось загрузить приветственный бонус", 500);
  }
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Неверный источник", 403);
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => null) as { config?: unknown } | null;
    const parsed = parseWelcomeBonusConfig(body?.config);
    if (!parsed) return jsonError("Проверьте максимум бонуса и число действий");
    const saved = await saveWelcomeBonusSettings(parsed, admin.email);
    return Response.json({ ok: true, ...saved, total: welcomeBonusTotal(saved.config) });
  } catch (error) {
    if ((error as Error).message === "ADMIN_UNAUTHORIZED") return jsonError("Нужна авторизация", 401);
    return jsonError("Не удалось сохранить", 500);
  }
}
