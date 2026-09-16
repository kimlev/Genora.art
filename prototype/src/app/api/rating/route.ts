import { getCatalogData } from "@/lib/server/catalog";
import { jsonError } from "@/lib/server/http";
import { currentUser } from "@/lib/server/session";
import { apiAppCopy } from "@/lib/i18n/copy/api-app";
import { requestLocale } from "@/lib/i18n/request-locale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await currentUser();
    return Response.json(await getCatalogData(user?.id ?? null, { includeImages: Boolean(user) }), {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    console.error("rating_load_failed", error);
    return jsonError(apiAppCopy(await requestLocale()).ratingLoadFailed, 500);
  }
}
