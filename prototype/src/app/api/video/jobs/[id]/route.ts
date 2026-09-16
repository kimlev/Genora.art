import { apiAppCopy } from "@/lib/i18n/copy/api-app";
import { requestLocale } from "@/lib/i18n/request-locale";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { dismissFailedVideoJob, getVideoJob, videoJobResult } from "@/lib/server/video-jobs";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const appCopy = apiAppCopy(await requestLocale());
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const job = await getVideoJob(user.id, id);
    if (!job) return jsonError(appCopy.imageConversationNotFound, 404);
    const payload = await videoJobResult(user.id, job);
    return Response.json(payload, { status: payload.generation ? 200 : payload.job.status === "failed" ? 200 : 202 });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(appCopy.authRequired, 401);
    return jsonError(appCopy.imagesHistoryFailed, 500);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const appCopy = apiAppCopy(await requestLocale());
  if (!isSameOrigin(request)) return jsonError(appCopy.invalidOrigin, 403);
  try {
    const user = await requireUser();
    const { id } = await context.params;
    await dismissFailedVideoJob(user.id, id);
    return Response.json({ ok: true });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(appCopy.authRequired, 401);
    return jsonError(appCopy.imagesHistoryFailed, 500);
  }
}
