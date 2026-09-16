import { auditAdmin, clearAdminSession, currentAdmin } from "@/lib/server/admin-session";
import { isSameOrigin, jsonError } from "@/lib/server/http";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Недопустимый источник запроса", 403);
  const admin = await currentAdmin();
  if (admin) await auditAdmin(request, admin.id, "logout", "administrator", admin.id);
  await clearAdminSession();
  return Response.json({ok:true});
}
