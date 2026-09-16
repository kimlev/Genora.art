import { query } from "@/lib/server/db";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return jsonError("Недопустимый источник запроса", 403);
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json().catch(() => null) as { title?: unknown; durationSec?: unknown } | null;
    const title = String(body?.title ?? "").trim().slice(0, 100);
    const durationSec = Math.round(Number(body?.durationSec));
    const hasDuration = Number.isFinite(durationSec) && durationSec > 0 && durationSec < 3600;
    if (!title && !hasDuration) return jsonError("Введите название", 400);
    const rows = title && hasDuration
      ? await query<{ id: string; title: string; duration_sec: number | null }>("UPDATE music_tracks SET title=$3,duration_sec=$4,updated_at=now() WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL RETURNING id,title,duration_sec", [id, user.id, title, durationSec])
      : title
        ? await query<{ id: string; title: string; duration_sec: number | null }>("UPDATE music_tracks SET title=$3,updated_at=now() WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL RETURNING id,title,duration_sec", [id, user.id, title])
        : await query<{ id: string; title: string; duration_sec: number | null }>("UPDATE music_tracks SET duration_sec=$3,updated_at=now() WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL RETURNING id,title,duration_sec", [id, user.id, durationSec]);
    if (!rows[0]) return jsonError("Трек не найден", 404);
    return Response.json({ id: rows[0].id, title: rows[0].title, durationSec: rows[0].duration_sec });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError("Войдите, чтобы изменить название", 401);
    return jsonError("Не удалось сохранить название", 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return jsonError("Недопустимый источник запроса", 403);
  try {
    const user = await requireUser();
    const { id } = await params;
    const rows = await query<{ id: string }>("UPDATE music_tracks SET deleted_at=now(),updated_at=now() WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL RETURNING id", [id, user.id]);
    if (!rows[0]) return jsonError("Трек не найден", 404);
    return Response.json({ ok: true });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError("Войдите, чтобы удалить трек", 401);
    return jsonError("Не удалось удалить трек", 500);
  }
}
