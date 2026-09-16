import { requireAdmin } from "@/lib/server/admin-session";
import { getAdminModelsData } from "@/lib/server/admin-models-data";
import { jsonError } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    return Response.json(await getAdminModelsData());
  } catch (error) {
    if ((error as Error).message === "ADMIN_UNAUTHORIZED") return jsonError("Требуется вход администратора", 401);
    console.error("admin_models_load_failed", error);
    return jsonError("Не удалось загрузить модели", 500);
  }
}
