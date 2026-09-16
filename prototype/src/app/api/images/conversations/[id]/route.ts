import { query } from "@/lib/server/db";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { apiAppCopy } from "@/lib/i18n/copy/api-app";
import { requestLocale } from "@/lib/i18n/request-locale";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  let locale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError(apiAppCopy(locale).invalidOrigin, 403);
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json().catch(() => null) as { title?: unknown; locale?: unknown } | null;
    if (typeof body?.locale === "string") locale = await requestLocale(body.locale);
    const copy = apiAppCopy(locale);
    const title = String(body?.title ?? "").replace(/[\n\r]+/g, " ").trim().slice(0, 120);
    if (!/^[0-9a-f-]{36}$/i.test(id) || !title) return jsonError(copy.invalidTitle);
    const rows = await query<{ id: string; title: string; updated_at: Date }>(`UPDATE image_conversations
      SET title=$3,updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING id,title,updated_at`, [id, user.id, title]);
    if (!rows[0]) return jsonError(copy.conversationNotFound, 404);
    return Response.json({ conversation: { id: rows[0].id, title: rows[0].title, updatedAt: rows[0].updated_at.toISOString() } });
  } catch (error) {
    const copy = apiAppCopy(locale);
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(copy.authRequired, 401);
    return jsonError(copy.conversationRenameFailed, 500);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const copy = apiAppCopy(await requestLocale(new URL(request.url).searchParams.get("locale")));
  if (!isSameOrigin(request)) return jsonError(copy.invalidOrigin, 403);
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(copy.conversationInvalid);
    const rows = await query<{ id: string }>("UPDATE image_conversations SET deleted_at=now(),updated_at=now() WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL RETURNING id", [id, user.id]);
    if (!rows[0]) return jsonError(copy.conversationNotFound, 404);
    await query("UPDATE image_generations SET deleted_at=now() WHERE conversation_id=$1 AND user_id=$2 AND deleted_at IS NULL", [id, user.id]);
    await query("UPDATE video_generations SET deleted_at=now() WHERE conversation_id=$1 AND user_id=$2 AND deleted_at IS NULL", [id, user.id]);
    return Response.json({ ok: true });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(copy.authRequired, 401);
    return jsonError(copy.conversationDeleteFailed, 500);
  }
}
