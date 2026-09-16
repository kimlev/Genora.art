import { apiAppCopy } from "@/lib/i18n/copy/api-app";
import { requestLocale } from "@/lib/i18n/request-locale";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import { dismissFailedGenerationJob, getGenerationJob, publicGenerationJob } from "@/lib/server/generation-jobs";
import { settleGenerationJob } from "@/lib/server/generation-settle";
import { requireUser } from "@/lib/server/session";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const appCopy = apiAppCopy(await requestLocale());
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const job = await getGenerationJob(user.id, id);
    if (!job) return jsonError(appCopy.imageConversationNotFound, 404);
    if (job.status === "creating") await settleGenerationJob(job).catch(() => undefined);
    const latest = await getGenerationJob(user.id, id);
    if (!latest) return jsonError(appCopy.imageConversationNotFound, 404);
    return Response.json(
      { job: publicGenerationJob(latest) },
      { status: latest.status === "creating" ? 202 : 200 },
    );
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
    await dismissFailedGenerationJob(user.id, id);
    return Response.json({ ok: true });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(appCopy.authRequired, 401);
    return jsonError(appCopy.imagesHistoryFailed, 500);
  }
}
