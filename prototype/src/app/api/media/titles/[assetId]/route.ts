import { query } from "@/lib/server/db";
import { requireUser } from "@/lib/server/session";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import { requestLocale } from "@/lib/i18n/request-locale";
import { apiAppCopy } from "@/lib/i18n/copy/api-app";
import { mediaTitleCopy } from "@/lib/i18n/copy/media-title";
import { normalizeMediaTitle } from "@/lib/media-title";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const locale = await requestLocale();
  const app = apiAppCopy(locale);
  const copy = mediaTitleCopy(locale);
  if (!isSameOrigin(request)) return jsonError(app.invalidOrigin, 403);
  try {
    const user = await requireUser();
    const { assetId } = await params;
    const body = await request.json().catch(() => null);
    const title = normalizeMediaTitle(body?.title);
    if (title === null || !assetId || assetId.length > 200 || !["photo", "video"].includes(body?.kind)) {
      return jsonError(copy.hint, 400);
    }
    // Table is selected from a fixed allowlist, never from user-provided SQL.
    const table = body.kind === "video" ? "video_generations" : "image_generations";
    const rows = await query<{ title: string }>(
      `INSERT INTO media_titles(user_id,kind,asset_id,title)
       SELECT $1,$2,$3,$4 WHERE EXISTS (
         SELECT 1 FROM ${table} g JOIN image_conversations c ON c.id=g.conversation_id
         WHERE g.user_id=$1 AND c.user_id=$1 AND $3=ANY(g.asset_ids)
           AND g.deleted_at IS NULL AND c.deleted_at IS NULL
       )
       ON CONFLICT (user_id,kind,asset_id) DO UPDATE SET title=EXCLUDED.title,updated_at=now()
       RETURNING title`,
      [user.id, body.kind, assetId, title],
    );
    if (!rows.length) return jsonError(app.conversationNotFound, 404);
    return Response.json({ title: rows[0].title });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(app.authRequired, 401);
    return jsonError(copy.failed, 500);
  }
}
