import { requireAdmin } from "@/lib/server/admin-session";
import { syncIntegratorCatalog } from "@/lib/server/catalog-sync";
import { isSameOrigin, jsonError } from "@/lib/server/http";

export const runtime="nodejs";

export async function POST(request:Request){
  if(!isSameOrigin(request)) return jsonError("Недопустимый источник запроса",403);
  try { await requireAdmin(); return Response.json({ok:true,...await syncIntegratorCatalog()}); }
  catch(error){
    if((error as Error).message==="ADMIN_UNAUTHORIZED") return jsonError("Требуется вход администратора",401);
    console.error("catalog_sync_failed",error instanceof Error?error.message:"unknown");
    return jsonError("Не удалось синхронизировать каталог",502);
  }
}
