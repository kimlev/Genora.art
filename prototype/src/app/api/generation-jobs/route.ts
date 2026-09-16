import { apiAppCopy } from "@/lib/i18n/copy/api-app";
import { requestLocale } from "@/lib/i18n/request-locale";
import { jsonError } from "@/lib/server/http";
import { listCreatingGenerationJobs, listVisibleGenerationJobs, publicGenerationJob } from "@/lib/server/generation-jobs";
import { settleGenerationJob } from "@/lib/server/generation-settle";
import { requireUser } from "@/lib/server/session";
import { listVisibleVideoJobs, publicVideoJob } from "@/lib/server/video-jobs";

export const runtime = "nodejs";

export async function GET() {
  const appCopy = apiAppCopy(await requestLocale());
  try {
    const user = await requireUser();
    const creating = await listCreatingGenerationJobs(user.id);
    await Promise.all(creating.map((job) => settleGenerationJob(job).catch(() => undefined)));
    const [latest, videos] = await Promise.all([
      listVisibleGenerationJobs(user.id),
      listVisibleVideoJobs(user.id),
    ]);
    return Response.json({
      jobs: [
        ...latest.map(publicGenerationJob),
        ...videos.map((job) => ({
          ...publicVideoJob(job),
          id: job.id,
          kind: "video" as const,
          surface: "images" as const,
          conversationId: job.conversation_id,
          status: job.status,
          title: job.prompt,
          modelLabel: job.model_label,
          createdAt: job.created_at.toISOString(),
        })),
      ],
    });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(appCopy.authRequired, 401);
    return jsonError(appCopy.imagesHistoryFailed, 500);
  }
}
