import { getCatalogData } from "@/lib/server/catalog";
import { jsonError } from "@/lib/server/http";
import { apiAppCopy } from "@/lib/i18n/copy/api-app";
import { requestLocale } from "@/lib/i18n/request-locale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getCatalogData(), { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    console.error("catalog_load_failed", error);
    return jsonError(apiAppCopy(await requestLocale()).catalogLoadFailed, 500);
  }
}
