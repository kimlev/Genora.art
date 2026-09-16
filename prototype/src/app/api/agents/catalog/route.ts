import { jsonError } from "@/lib/server/http";
import { listPublicCatalogAgents } from "@/lib/server/system-agents";

export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json({ items: await listPublicCatalogAgents() });
  } catch {
    return jsonError("Не удалось загрузить каталог агентов", 500);
  }
}
