import { requireAdmin } from "@/lib/server/admin-session";
import { getAdminUsageSlice, parseUsageKind } from "@/lib/server/admin-dashboard-data";
import { jsonError } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const from = url.searchParams.get("from") || new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    const to = url.searchParams.get("to") || new Date().toISOString().slice(0, 10);
    const userId = url.searchParams.get("userId");
    const model = url.searchParams.get("model");
    const provider = url.searchParams.get("provider");
    const type = url.searchParams.get("type");
    const page = Number(url.searchParams.get("page") || "1");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) return jsonError("Некорректный период");
    if (userId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) return jsonError("Некорректный пользователь");
    if (model && model.length > 200) return jsonError("Некорректная модель");
    if (provider && provider.length > 80) return jsonError("Некорректный провайдер");
    if (type && !parseUsageKind(type)) return jsonError("Некорректный тип");
    if (!Number.isFinite(page) || page < 1 || page > 10_000) return jsonError("Некорректная страница");
    return Response.json(await getAdminUsageSlice(from, to, userId, model, provider, page, type));
  } catch (error) {
    if ((error as Error).message === "ADMIN_UNAUTHORIZED") return jsonError("Требуется вход администратора", 401);
    console.error("admin_usage_failed", error);
    return jsonError("Не удалось загрузить использование", 500);
  }
}
