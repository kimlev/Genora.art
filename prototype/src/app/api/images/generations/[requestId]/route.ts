import { query } from "@/lib/server/db";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { apiAppCopy } from "@/lib/i18n/copy/api-app";
import { requestLocale } from "@/lib/i18n/request-locale";

export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const copy = apiAppCopy(await requestLocale(new URL(request.url).searchParams.get("locale")));
  if (!isSameOrigin(request)) return jsonError(copy.invalidOrigin, 403);
  try {
    const user = await requireUser();
    const { requestId } = await params;
    if (!requestId) return jsonError(copy.conversationInvalid);
    const rows = await query<{ conversation_id: string }>(
      "UPDATE image_generations SET deleted_at=now() WHERE request_id=$1 AND user_id=$2 AND deleted_at IS NULL RETURNING conversation_id",
      [requestId, user.id],
    );
    const videoRows = rows[0]
      ? []
      : await query<{ conversation_id: string }>(
        "UPDATE video_generations SET deleted_at=now() WHERE request_id=$1 AND user_id=$2 AND deleted_at IS NULL RETURNING conversation_id",
        [requestId, user.id],
      );
    const conversationId = rows[0]?.conversation_id ?? videoRows[0]?.conversation_id;
    if (!conversationId) return jsonError(copy.conversationNotFound, 404);
    const leftover = await query<{ id: string }>(
      `SELECT id FROM image_generations WHERE conversation_id=$1 AND deleted_at IS NULL
       UNION ALL
       SELECT id FROM video_generations WHERE conversation_id=$1 AND deleted_at IS NULL
       LIMIT 1`,
      [conversationId],
    );
    if (!leftover[0]) {
      await query("UPDATE image_conversations SET deleted_at=now(),updated_at=now() WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL", [conversationId, user.id]);
    }
    return Response.json({ ok: true });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(copy.authRequired, 401);
    return jsonError(copy.conversationDeleteFailed, 500);
  }
}
