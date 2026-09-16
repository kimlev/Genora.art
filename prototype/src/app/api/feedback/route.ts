import { query } from "@/lib/server/db";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { apiAppCopy } from "@/lib/i18n/copy/api-app";
import { requestLocale } from "@/lib/i18n/request-locale";

export const runtime = "nodejs";

type FeedbackRow = { message_id: string; model_name: string; vote: -1 | 1 };

export async function GET() {
  const copy = apiAppCopy(await requestLocale());
  try {
    const user = await requireUser();
    const rows = await query<FeedbackRow>("SELECT message_id, model_name, vote FROM model_feedback WHERE user_id=$1", [user.id]);
    return Response.json({ feedback: Object.fromEntries(rows.map((row) => [row.message_id, { modelName: row.model_name, vote: row.vote }])) });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(copy.authRequired, 401);
    return jsonError(copy.feedbackLoadFailed, 500);
  }
}

export async function POST(request: Request) {
  let locale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError(apiAppCopy(locale).invalidOrigin, 403);
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => null) as { messageId?: unknown; modelId?: unknown; modelName?: unknown; vote?: unknown; locale?: unknown } | null;
    if (typeof body?.locale === "string") locale = await requestLocale(body.locale);
    const messageId = String(body?.messageId ?? "").slice(0, 160);
    const modelId = String(body?.modelId ?? "").slice(0, 160) || null;
    const modelName = String(body?.modelName ?? "").slice(0, 160);
    const vote = body?.vote === 1 || body?.vote === -1 ? body.vote : null;
    if (!messageId || !modelName || !vote) return jsonError(apiAppCopy(locale).feedbackInvalid);
    const existing = await query<{ vote: number }>("SELECT vote FROM model_feedback WHERE message_id=$1 AND user_id=$2", [messageId,user.id]);
    if (existing[0]?.vote === vote) await query("DELETE FROM model_feedback WHERE message_id=$1 AND user_id=$2", [messageId,user.id]);
    else await query(`INSERT INTO model_feedback(message_id,user_id,model_name,model_id,vote) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(message_id,user_id) DO UPDATE SET model_name=EXCLUDED.model_name,model_id=EXCLUDED.model_id,vote=EXCLUDED.vote,updated_at=now()`, [messageId,user.id,modelName,modelId,vote]);
    return Response.json({ ok: true });
  } catch (error) {
    const copy = apiAppCopy(locale);
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(copy.authRequired, 401);
    return jsonError(copy.feedbackSaveFailed, 500);
  }
}
